#!/usr/bin/env python3
"""
Admin Bot v2.0 - Telegram бот для администраторов
Функции: уведомления о заказах, управление статусами, статистика
"""

import os
import logging
import aiohttp
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, Bot
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from telegram.constants import ParseMode
from telegram.error import TelegramError, Forbidden, BadRequest, TimedOut, NetworkError

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import uvicorn
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Config
# Admin Bot требует отдельный токен (ADMIN_BOT_TOKEN)
BOT_TOKEN = os.getenv('ADMIN_BOT_TOKEN', '')
ADMIN_CHAT_ID_RAW = os.getenv('ADMIN_CHAT_ID') or os.getenv('TELEGRAM_MANAGER_CHAT_ID', '')
ADMIN_WHITELIST_RAW = os.getenv('ADMIN_WHITELIST', '')
API_URL = os.getenv('API_URL', 'http://localhost:3000/api')
PORT = int(os.getenv('ADMIN_BOT_PORT', '8002'))
USE_WEBHOOK = os.getenv('USE_WEBHOOK', 'false').lower() == 'true'
WEBHOOK_URL = os.getenv('ADMIN_BOT_WEBHOOK_URL', '')

# Игнорируем дефолтные значения (123456789 - это placeholder)
DEFAULT_PLACEHOLDER_IDS = ['123456789', '123456', '0', '']

# Обработка ADMIN_CHAT_ID - игнорируем дефолтные значения
ADMIN_CHAT_ID = None
if ADMIN_CHAT_ID_RAW and ADMIN_CHAT_ID_RAW not in DEFAULT_PLACEHOLDER_IDS:
    ADMIN_CHAT_ID = ADMIN_CHAT_ID_RAW

# Обработка ADMIN_WHITELIST - парсим и фильтруем дефолтные значения
ADMIN_WHITELIST = []
if ADMIN_WHITELIST_RAW:
    for admin_id in ADMIN_WHITELIST_RAW.split(','):
        admin_id = admin_id.strip()
        if admin_id and admin_id not in DEFAULT_PLACEHOLDER_IDS:
            ADMIN_WHITELIST.append(admin_id)

if BOT_TOKEN:
    logger.info(f'✅ Admin Bot token loaded')
else:
    logger.warning('⚠️ ADMIN_BOT_TOKEN not set - Admin Bot disabled')

if ADMIN_CHAT_ID:
    logger.info(f'✅ Admin chat ID: {ADMIN_CHAT_ID}')
elif ADMIN_CHAT_ID_RAW in DEFAULT_PLACEHOLDER_IDS:
    logger.info(f'ℹ️  ADMIN_CHAT_ID is set to default placeholder - ignoring')
else:
    logger.warning('⚠️ ADMIN_CHAT_ID not set')

if ADMIN_WHITELIST:
    logger.info(f'✅ Admin whitelist: {ADMIN_WHITELIST}')
else:
    logger.warning('⚠️ ADMIN_WHITELIST not set or contains only default values')

# Models
class OrderNotification(BaseModel):
    orderNumber: str
    orderId: Optional[int] = None
    customerName: str = ''
    customerPhone: str = ''
    customerEmail: str = ''
    customerAddress: str = ''
    comment: str = ''
    items: str = ''
    total: float = 0
    createdAt: Optional[str] = None

class StatusNotification(BaseModel):
    orderNumber: str
    status: str
    oldStatus: Optional[str] = None

# Statuses (для ритуальных товаров без доставки)
STATUSES = {
    'NEW': ('🆕', 'Новый', ['CONFIRMED', 'CANCELLED']),
    'PENDING': ('🆕', 'Новый', ['CONFIRMED', 'CANCELLED']),
    'CONFIRMED': ('✅', 'Подтверждён', ['PROCESSING', 'CANCELLED']),
    'PROCESSING': ('🔄', 'В работе', ['SHIPPED', 'CANCELLED']),
    'SHIPPED': ('📦', 'Готов к выдаче', ['DELIVERED']),
    'DELIVERED': ('🎉', 'Выдан', []),
    'CANCELLED': ('❌', 'Отменён', []),
}

# Список ID админов для уведомлений (из ADMIN_WHITELIST или ADMIN_CHAT_ID)
def get_admin_ids() -> list:
    """Получить список ID админов для отправки уведомлений"""
    admin_ids = []
    
    # Сначала добавляем из ADMIN_WHITELIST (приоритет)
    if ADMIN_WHITELIST:
        for admin_id in ADMIN_WHITELIST:
            try:
                admin_id_int = int(admin_id)
                # Проверяем, что это не дефолтное значение
                if str(admin_id_int) not in DEFAULT_PLACEHOLDER_IDS:
                    admin_ids.append(admin_id_int)
                else:
                    logger.warning(f"Skipping default placeholder ID: {admin_id}")
            except ValueError:
                logger.warning(f"Invalid admin ID in whitelist: {admin_id}")
    
    # Если ADMIN_CHAT_ID указан и его нет в списке - добавляем (только если не дефолтный)
    if ADMIN_CHAT_ID:
        try:
            chat_id = int(ADMIN_CHAT_ID)
            if str(chat_id) not in DEFAULT_PLACEHOLDER_IDS:
                if chat_id not in admin_ids:
                    admin_ids.append(chat_id)
            else:
                logger.warning(f"Skipping default placeholder ADMIN_CHAT_ID: {ADMIN_CHAT_ID}")
        except ValueError:
            logger.warning(f"Invalid ADMIN_CHAT_ID: {ADMIN_CHAT_ID}")
    
    return admin_ids

application: Optional[Application] = None

def get_bot() -> Bot:
    return application.bot if application else Bot(token=BOT_TOKEN)

def is_admin(user_id: int) -> bool:
    return str(user_id) == str(ADMIN_CHAT_ID) or str(user_id) in ADMIN_WHITELIST

def order_keyboard(order_num: str, status: str = 'NEW') -> InlineKeyboardMarkup:
    kb = []
    _, _, next_statuses = STATUSES.get(status.upper(), STATUSES['NEW'])
    btns = []
    for s in next_statuses:
        emoji, text, _ = STATUSES.get(s, ('📋', s, []))
        btns.append(InlineKeyboardButton(f"{emoji} {text}", callback_data=f"st_{order_num}_{s}"))
    for i in range(0, len(btns), 2):
        kb.append(btns[i:i+2])
    kb.append([InlineKeyboardButton("📋 Детали", callback_data=f"det_{order_num}")])
    return InlineKeyboardMarkup(kb)

def main_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("📊 Статистика", callback_data="stats"),
         InlineKeyboardButton("📦 Заказы", callback_data="orders")],
        [InlineKeyboardButton("🆕 Новые", callback_data="ord_NEW"),
         InlineKeyboardButton("🔄 В работе", callback_data="ord_PROCESSING")]
    ])

# Handlers
async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_admin(update.effective_user.id):
        await update.message.reply_text("⛔ Доступ запрещён")
        return
    await update.message.reply_text(
        f"👋 <b>Админ-панель ОптМрамор</b>\n\nВыберите действие:",
        parse_mode=ParseMode.HTML, reply_markup=main_keyboard()
    )

async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    if not is_admin(q.from_user.id):
        await q.answer("⛔ Доступ запрещён", show_alert=True)
        return
    await q.answer()
    data = q.data
    
    if data == "main":
        await q.edit_message_text("🏠 <b>Меню</b>", parse_mode=ParseMode.HTML, reply_markup=main_keyboard())
    elif data == "stats":
        await q.edit_message_text("📊 <b>Статистика</b>\n\nЗагрузка...", parse_mode=ParseMode.HTML,
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("◀️ Назад", callback_data="main")]]))
    elif data == "orders":
        await q.edit_message_text("📦 <b>Заказы</b>", parse_mode=ParseMode.HTML,
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🆕 Новые", callback_data="ord_NEW")],
                [InlineKeyboardButton("◀️ Назад", callback_data="main")]
            ]))
    elif data.startswith("st_"):
        parts = data.split("_")
        if len(parts) >= 3:
            order_num, new_status = parts[1], parts[2]
            emoji, text, _ = STATUSES.get(new_status, ('📋', new_status, []))
            await q.answer(f"✅ Статус: {text}", show_alert=True)
            # TODO: API call to update status
    elif data.startswith("det_"):
        order_num = data.replace("det_", "")
        await q.edit_message_text(f"📦 <b>Заказ #{order_num}</b>\n\nЗагрузка...", parse_mode=ParseMode.HTML,
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("◀️ Назад", callback_data="main")]]))

# Notifications
async def send_order_notification(data: OrderNotification) -> bool:
    """Отправить уведомление о новом заказе ВСЕМ админам из ADMIN_WHITELIST"""
    admin_ids = get_admin_ids()
    
    logger.info(f"🔄 Processing order notification for #{data.orderNumber}")
    logger.info(f"📋 Admin IDs to notify: {admin_ids}")
    
    if not admin_ids:
        logger.error("❌ No admin IDs configured - cannot send notification")
        logger.error("   Set ADMIN_WHITELIST or ADMIN_CHAT_ID in environment")
        return False
    
    if not BOT_TOKEN:
        logger.error("❌ BOT_TOKEN not set - cannot send notification")
        return False
    
    try:
        bot = get_bot()
        if not bot:
            logger.error("❌ Bot not initialized")
            return False
        
        msg = f"""
🆕 <b>НОВЫЙ ЗАКАЗ!</b>

📦 <b>#{data.orderNumber}</b>

👤 {data.customerName}
📱 {data.customerPhone}
{f'📧 {data.customerEmail}' if data.customerEmail else ''}
{f'📍 {data.customerAddress}' if data.customerAddress else ''}
{f'💬 Комментарий: {data.comment}' if data.comment else ''}

📦 <b>Товары:</b>
{data.items}

💰 <b>Сумма:</b> {data.total:,.0f} ₽

⚡️ Требуется обработка!
        """.strip()
        
        # Отправляем уведомление КАЖДОМУ админу
        success_count = 0
        failed_count = 0
        
        for admin_id in admin_ids:
            try:
                logger.info(f"📤 Attempting to send notification to admin {admin_id} (type: {type(admin_id).__name__})")
                
                # Проверяем, может ли бот писать пользователю (получаем информацию о чате)
                try:
                    chat = await bot.get_chat(chat_id=admin_id)
                    logger.info(f"✅ Chat info retrieved for {admin_id}: {chat.type if hasattr(chat, 'type') else 'user'}")
                except Forbidden:
                    logger.error(f"❌ Admin {admin_id}: Bot is blocked or user hasn't started the bot. User MUST send /start first!")
                    failed_count += 1
                    continue
                except BadRequest as e:
                    logger.error(f"❌ Admin {admin_id}: Invalid chat ID or chat not found: {e}")
                    failed_count += 1
                    continue
                
                # Отправляем сообщение
                await bot.send_message(
                    chat_id=admin_id, 
                    text=msg, 
                    parse_mode=ParseMode.HTML,
                    reply_markup=order_keyboard(data.orderNumber, 'NEW')
                )
                logger.info(f"✅ Notification sent successfully to admin {admin_id}")
                success_count += 1
                
            except Forbidden as e:
                logger.error(f"❌ Admin {admin_id}: Bot blocked or user hasn't started the bot. Error: {e}")
                logger.error(f"   💡 User {admin_id} MUST send /start to the bot first!")
                failed_count += 1
            except BadRequest as e:
                error_msg = str(e)
                if "chat not found" in error_msg.lower():
                    logger.error(f"❌ Admin {admin_id}: Chat not found - user hasn't started the bot!")
                    logger.error(f"   💡 User {admin_id} MUST send /start to the bot first!")
                else:
                    logger.error(f"❌ Admin {admin_id}: Bad request: {e}")
                failed_count += 1
            except TelegramError as e:
                logger.error(f"❌ Admin {admin_id}: Telegram error: {e}")
                failed_count += 1
            except Exception as e:
                logger.exception(f"❌ Admin {admin_id}: Unexpected error: {e}")
                failed_count += 1
        
        logger.info(f"📊 Notification results for #{data.orderNumber}: {success_count} sent, {failed_count} failed out of {len(admin_ids)} total")
        
        if failed_count > 0:
            logger.warning(f"⚠️  {failed_count} admin(s) didn't receive notification. They must send /start to the bot first!")
        
        return success_count > 0
        
    except Exception as e:
        logger.exception(f"❌ Unexpected error sending notifications: {e}")
        return False

async def send_status_notification(data: StatusNotification) -> bool:
    if not ADMIN_CHAT_ID:
        return False
    try:
        bot = get_bot()
        e1, t1, _ = STATUSES.get(data.oldStatus.upper() if data.oldStatus else 'NEW', ('📋', '?', []))
        e2, t2, _ = STATUSES.get(data.status.upper(), ('📋', data.status, []))
        msg = f"🔄 <b>Статус изменён</b>\n\n#{data.orderNumber}\n{e1} {t1} → {e2} {t2}"
        await bot.send_message(chat_id=ADMIN_CHAT_ID, text=msg, parse_mode=ParseMode.HTML)
        return True
    except TelegramError as e:
        logger.error(f"Failed: {e}")
        return False

# Error Handler
async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Глобальный обработчик ошибок"""
    error = context.error
    if isinstance(error, Forbidden):
        logger.warning(f"Forbidden: {error}")
    elif isinstance(error, BadRequest):
        logger.error(f"Bad request: {error}")
    elif isinstance(error, (TimedOut, NetworkError)):
        logger.warning(f"Network issue: {error}")
    else:
        logger.exception(f"Unexpected error: {error}")

# FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    global application
    logger.info("🚀 Starting Admin Bot...")
    if BOT_TOKEN:
        application = Application.builder().token(BOT_TOKEN).build()
        application.add_handler(CommandHandler("start", start_cmd))
        application.add_handler(CallbackQueryHandler(callback_handler))
        application.add_error_handler(error_handler)
        await application.initialize()
        await application.start()
        if USE_WEBHOOK and WEBHOOK_URL:
            await application.bot.set_webhook(f"{WEBHOOK_URL}/webhook")
        else:
            await application.updater.start_polling(drop_pending_updates=True)
    yield
    if application:
        if not USE_WEBHOOK:
            await application.updater.stop()
        await application.stop()
        await application.shutdown()

api = FastAPI(title="Admin Bot API", version="2.0.0", lifespan=lifespan)

@api.get("/health")
async def health():
    return {"status": "ok", "bot": application is not None}

@api.post("/webhook")
async def webhook(request: Request):
    if not application:
        raise HTTPException(503, "Bot not ready")
    data = await request.json()
    update = Update.de_json(data, application.bot)
    await application.process_update(update)
    return {"ok": True}

@api.post("/notify/admin")
async def notify_admin(data: OrderNotification, bg: BackgroundTasks):
    logger.info(f"📥 Received admin notification request for order #{data.orderNumber}")
    
    if not ADMIN_CHAT_ID:
        logger.error("❌ ADMIN_CHAT_ID not set - cannot send notification")
        raise HTTPException(status_code=500, detail="ADMIN_CHAT_ID not configured")
    
    logger.info(f"📤 Queuing notification to admin chat ID: {ADMIN_CHAT_ID}")
    bg.add_task(send_order_notification, data)
    return {"status": "queued", "orderNumber": data.orderNumber, "adminChatId": ADMIN_CHAT_ID}

@api.post("/notify/status")
async def notify_status(data: StatusNotification, bg: BackgroundTasks):
    bg.add_task(send_status_notification, data)
    return {"status": "queued"}

if __name__ == '__main__':
    uvicorn.run("admin_bot_v2:api", host="0.0.0.0", port=PORT, reload=False)
