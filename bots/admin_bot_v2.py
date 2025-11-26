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
ADMIN_CHAT_ID = os.getenv('ADMIN_CHAT_ID') or os.getenv('TELEGRAM_MANAGER_CHAT_ID', '')
ADMIN_WHITELIST = [x.strip() for x in os.getenv('ADMIN_WHITELIST', '').split(',') if x.strip()]
API_URL = os.getenv('API_URL', 'http://localhost:3000/api')
PORT = int(os.getenv('ADMIN_BOT_PORT', '8002'))
USE_WEBHOOK = os.getenv('USE_WEBHOOK', 'false').lower() == 'true'
WEBHOOK_URL = os.getenv('ADMIN_BOT_WEBHOOK_URL', '')

if BOT_TOKEN:
    logger.info(f'✅ Admin Bot token loaded')
else:
    logger.warning('⚠️ ADMIN_BOT_TOKEN not set - Admin Bot disabled')

if ADMIN_CHAT_ID:
    logger.info(f'✅ Admin chat ID: {ADMIN_CHAT_ID}')
else:
    logger.warning('⚠️ ADMIN_CHAT_ID not set')

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

# Statuses
STATUSES = {
    'NEW': ('🆕', 'Новый', ['CONFIRMED', 'CANCELLED']),
    'CONFIRMED': ('✅', 'Подтверждён', ['PROCESSING', 'CANCELLED']),
    'PROCESSING': ('🔄', 'В обработке', ['SHIPPED', 'CANCELLED']),
    'SHIPPED': ('🚚', 'Отправлен', ['DELIVERED']),
    'DELIVERED': ('🎉', 'Доставлен', []),
    'CANCELLED': ('❌', 'Отменён', []),
}

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
    if not ADMIN_CHAT_ID:
        return False
    try:
        bot = get_bot()
        msg = f"""
🆕 <b>НОВЫЙ ЗАКАЗ!</b>

📦 <b>#{data.orderNumber}</b>

👤 {data.customerName}
📱 {data.customerPhone}

📦 <b>Товары:</b>
{data.items}

💰 <b>Сумма:</b> {data.total:,.0f} ₽

⚡️ Требуется обработка!
        """.strip()
        await bot.send_message(chat_id=ADMIN_CHAT_ID, text=msg, parse_mode=ParseMode.HTML,
            reply_markup=order_keyboard(data.orderNumber, 'NEW'))
        logger.info(f"Order notification sent: #{data.orderNumber}")
        return True
    except TelegramError as e:
        logger.error(f"Failed to send notification: {e}")
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
    bg.add_task(send_order_notification, data)
    return {"status": "queued"}

@api.post("/notify/status")
async def notify_status(data: StatusNotification, bg: BackgroundTasks):
    bg.add_task(send_status_notification, data)
    return {"status": "queued"}

if __name__ == '__main__':
    uvicorn.run("admin_bot_v2:api", host="0.0.0.0", port=PORT, reload=False)
