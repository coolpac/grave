#!/usr/bin/env python3
"""
Customer Bot v2.0 - Улучшенный Telegram бот для клиентов
Функции:
- Уведомления о заказах с inline кнопками
- Отслеживание статуса заказа
- Напоминания о брошенных корзинах
- Интерактивное меню
- Webhook/Polling поддержка
"""

import os
import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from telegram import (
    Update, 
    InlineKeyboardButton, 
    InlineKeyboardMarkup,
    WebAppInfo,
    Bot
)
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
    MessageHandler,
    filters
)
from telegram.constants import ParseMode
from telegram.error import TelegramError, Forbidden, BadRequest, TimedOut, NetworkError

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import uvicorn
from pydantic import BaseModel
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('customer_bot.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# ============================================
# Конфигурация
# ============================================
# Fallback: если CUSTOMER_BOT_TOKEN не задан, используем BOT_TOKEN
BOT_TOKEN = os.getenv('CUSTOMER_BOT_TOKEN') or os.getenv('BOT_TOKEN', '')
_webapp_url = os.getenv('WEBAPP_URL') or os.getenv('PUBLIC_URL', 'https://optmramor.ru')
# WebAppInfo требует HTTPS! Преобразуем http -> https
WEBAPP_URL = _webapp_url.replace('http://', 'https://') if _webapp_url.startswith('http://') else _webapp_url
API_URL = os.getenv('API_URL', 'http://localhost:3000/api')
WEBHOOK_URL = os.getenv('CUSTOMER_BOT_WEBHOOK_URL', '')
PORT = int(os.getenv('CUSTOMER_BOT_PORT', '8001'))
USE_WEBHOOK = os.getenv('USE_WEBHOOK', 'false').lower() == 'true'

if not BOT_TOKEN:
    logger.error('❌ BOT TOKEN not set! Set CUSTOMER_BOT_TOKEN or BOT_TOKEN')
else:
    logger.info(f'✅ Bot token loaded (ends with ...{BOT_TOKEN[-6:]})')
    
logger.info(f'📱 WebApp URL: {WEBAPP_URL}')

# ============================================
# Pydantic Models для API запросов
# ============================================
class OrderNotification(BaseModel):
    telegramId: str
    orderNumber: str
    orderId: Optional[int] = None
    customerName: str = ''
    total: float = 0
    items: Optional[str] = None
    status: Optional[str] = None

class StatusNotification(BaseModel):
    telegramId: str
    orderNumber: str
    status: str
    statusText: Optional[str] = None

class AbandonedCartNotification(BaseModel):
    telegramId: str
    cartId: int
    items: str = ''
    totalAmount: float = 0
    daysSinceAbandoned: int = 0

class CustomNotification(BaseModel):
    telegramId: str
    message: str
    buttons: Optional[list] = None

# ============================================
# Telegram Bot Application
# ============================================
application: Optional[Application] = None

def get_bot() -> Bot:
    """Получить экземпляр бота"""
    if application and application.bot:
        return application.bot
    return Bot(token=BOT_TOKEN)

# ============================================
# Inline Keyboards
# ============================================
def get_order_keyboard(order_number: str) -> InlineKeyboardMarkup:
    """Клавиатура для уведомления о заказе"""
    keyboard = [
        [
            InlineKeyboardButton(
                "📦 Отследить заказ", 
                callback_data=f"track_{order_number}"
            ),
        ],
        [
            InlineKeyboardButton(
                "🛒 Открыть магазин", 
                web_app=WebAppInfo(url=WEBAPP_URL)
            ),
        ],
        [
            InlineKeyboardButton(
                "💬 Связаться с нами", 
                callback_data="contact_support"
            ),
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_cart_reminder_keyboard(cart_id: int) -> InlineKeyboardMarkup:
    """Клавиатура для напоминания о корзине"""
    keyboard = [
        [
            InlineKeyboardButton(
                "🛒 Вернуться к покупкам", 
                web_app=WebAppInfo(url=f"{WEBAPP_URL}?cart={cart_id}")
            ),
        ],
        [
            InlineKeyboardButton(
                "❌ Не напоминать", 
                callback_data=f"dismiss_cart_{cart_id}"
            ),
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """Главное меню бота"""
    # Проверяем можем ли использовать WebApp (требует HTTPS)
    if WEBAPP_URL.startswith('https://'):
        catalog_button = InlineKeyboardButton(
            "🛍️ Открыть каталог", 
            web_app=WebAppInfo(url=WEBAPP_URL)
        )
    else:
        # Fallback на обычную URL кнопку
        catalog_button = InlineKeyboardButton(
            "🛍️ Открыть каталог", 
            url=WEBAPP_URL
        )
    
    keyboard = [
        [catalog_button],
        [
            InlineKeyboardButton("📦 Мои заказы", callback_data="my_orders"),
            InlineKeyboardButton("❓ Помощь", callback_data="help"),
        ],
        [
            InlineKeyboardButton("📞 Контакты", callback_data="contacts"),
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_status_emoji(status: str) -> str:
    """Эмодзи для статуса заказа"""
    status_emojis = {
        'NEW': '🆕',
        'PENDING': '⏳',
        'CONFIRMED': '✅',
        'PROCESSING': '🔄',
        'SHIPPED': '🚚',
        'DELIVERED': '🎉',
        'CANCELLED': '❌',
        'REFUNDED': '💰',
    }
    return status_emojis.get(status.upper(), '📦')

def get_status_text(status: str) -> str:
    """Текст статуса на русском"""
    status_texts = {
        'NEW': 'Новый',
        'PENDING': 'Ожидает подтверждения',
        'CONFIRMED': 'Подтверждён',
        'PROCESSING': 'В обработке',
        'SHIPPED': 'Отправлен',
        'DELIVERED': 'Доставлен',
        'CANCELLED': 'Отменён',
        'REFUNDED': 'Возврат средств',
    }
    return status_texts.get(status.upper(), status)

# ============================================
# Command Handlers
# ============================================
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /start"""
    user = update.effective_user
    
    # Проверяем deep link параметры
    args = context.args
    if args:
        param = args[0]
        if param.startswith('cart_'):
            cart_id = param.replace('cart_', '')
            await update.message.reply_text(
                f"🛒 Возвращаемся к вашей корзине...",
                reply_markup=InlineKeyboardMarkup([[
                    InlineKeyboardButton(
                        "Открыть корзину",
                        web_app=WebAppInfo(url=f"{WEBAPP_URL}/cart")
                    )
                ]])
            )
            return
        elif param.startswith('order_'):
            order_number = param.replace('order_', '')
            await update.message.reply_text(
                f"📦 Загружаем информацию о заказе #{order_number}...",
                reply_markup=get_order_keyboard(order_number)
            )
            return

    welcome_message = f"""
👋 <b>Добро пожаловать, {user.first_name}!</b>

Я бот магазина <b>ОптМрамор</b> — помогу вам:

• 🛍️ Выбрать и заказать товары
• 📦 Отслеживать статус заказов  
• 🔔 Получать уведомления об акциях
• 💬 Связаться с поддержкой

Нажмите кнопку ниже, чтобы открыть каталог:
    """.strip()

    await update.message.reply_text(
        welcome_message,
        parse_mode=ParseMode.HTML,
        reply_markup=get_main_menu_keyboard()
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /help"""
    help_text = """
📖 <b>Справка по боту</b>

<b>Команды:</b>
/start - Главное меню
/help - Эта справка
/orders - Мои заказы
/contacts - Контактная информация

<b>Как сделать заказ:</b>
1. Откройте каталог через кнопку меню
2. Выберите товары и добавьте в корзину
3. Оформите заказ в приложении
4. Получайте уведомления о статусе

<b>Вопросы?</b>
Напишите нам — мы всегда рады помочь!
    """.strip()

    await update.message.reply_text(
        help_text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_main_menu_keyboard()
    )

async def orders_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /orders"""
    await update.message.reply_text(
        "📦 <b>Ваши заказы</b>\n\nОткройте приложение, чтобы увидеть историю заказов:",
        parse_mode=ParseMode.HTML,
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton(
                "📋 История заказов",
                web_app=WebAppInfo(url=f"{WEBAPP_URL}/orders")
            )
        ]])
    )

async def contacts_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /contacts"""
    contacts_text = """
📞 <b>Контактная информация</b>

🏢 <b>ОптМрамор</b>
Изделия из натурального камня

📱 Телефон: +7 (XXX) XXX-XX-XX
📧 Email: info@optmramor.ru
🌐 Сайт: optmramor.ru

⏰ <b>Режим работы:</b>
Пн-Пт: 9:00 - 18:00
Сб-Вс: выходной

💬 Напишите нам прямо сейчас!
    """.strip()

    await update.message.reply_text(
        contacts_text,
        parse_mode=ParseMode.HTML,
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🌐 Открыть сайт", url="https://optmramor.ru")],
            [InlineKeyboardButton("◀️ Назад в меню", callback_data="main_menu")]
        ])
    )

# ============================================
# Callback Query Handlers
# ============================================
async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик callback кнопок"""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    
    if data == "main_menu":
        await query.edit_message_text(
            "🏠 <b>Главное меню</b>\n\nВыберите действие:",
            parse_mode=ParseMode.HTML,
            reply_markup=get_main_menu_keyboard()
        )
    
    elif data == "my_orders":
        await query.edit_message_text(
            "📦 <b>Ваши заказы</b>\n\nОткройте приложение для просмотра:",
            parse_mode=ParseMode.HTML,
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton(
                    "📋 Открыть заказы",
                    web_app=WebAppInfo(url=f"{WEBAPP_URL}/orders")
                )],
                [InlineKeyboardButton("◀️ Назад", callback_data="main_menu")]
            ])
        )
    
    elif data == "help":
        help_text = """
📖 <b>Справка</b>

• Откройте каталог для выбора товаров
• Добавьте товары в корзину
• Оформите заказ
• Отслеживайте статус здесь

Нужна помощь? Нажмите «Связаться с нами»
        """.strip()
        await query.edit_message_text(
            help_text,
            parse_mode=ParseMode.HTML,
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("💬 Связаться с нами", callback_data="contact_support")],
                [InlineKeyboardButton("◀️ Назад", callback_data="main_menu")]
            ])
        )
    
    elif data == "contacts":
        await query.edit_message_text(
            "📞 <b>Контакты</b>\n\n📱 +7 (XXX) XXX-XX-XX\n📧 info@optmramor.ru",
            parse_mode=ParseMode.HTML,
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🌐 Сайт", url="https://optmramor.ru")],
                [InlineKeyboardButton("◀️ Назад", callback_data="main_menu")]
            ])
        )
    
    elif data == "contact_support":
        await query.edit_message_text(
            "💬 <b>Связаться с поддержкой</b>\n\nНапишите ваш вопрос прямо в этот чат, и мы ответим в ближайшее время!",
            parse_mode=ParseMode.HTML,
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("◀️ Назад", callback_data="main_menu")]
            ])
        )
    
    elif data.startswith("track_"):
        order_number = data.replace("track_", "")
        await query.edit_message_text(
            f"📦 <b>Отслеживание заказа #{order_number}</b>\n\nОткройте приложение для подробной информации:",
            parse_mode=ParseMode.HTML,
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton(
                    "📋 Подробнее о заказе",
                    web_app=WebAppInfo(url=f"{WEBAPP_URL}/order/{order_number}")
                )],
                [InlineKeyboardButton("◀️ Назад", callback_data="main_menu")]
            ])
        )
    
    elif data.startswith("dismiss_cart_"):
        cart_id = data.replace("dismiss_cart_", "")
        await query.edit_message_text(
            "✅ Хорошо, не будем напоминать об этой корзине.\n\nЕсли передумаете — мы всегда рядом! 🛒",
            parse_mode=ParseMode.HTML,
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🛍️ Открыть магазин", web_app=WebAppInfo(url=WEBAPP_URL))]
            ])
        )
        # TODO: Отправить запрос в API для отключения напоминаний

async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик текстовых сообщений (для поддержки)"""
    user = update.effective_user
    text = update.message.text
    
    # Логируем сообщение для поддержки
    logger.info(f"Support message from {user.id} ({user.username}): {text}")
    
    await update.message.reply_text(
        "📨 <b>Сообщение получено!</b>\n\nМы ответим в ближайшее время. Спасибо за обращение!",
        parse_mode=ParseMode.HTML,
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu")]
        ])
    )

# ============================================
# Notification Functions (вызываются из API)
# ============================================
async def send_order_notification(data: OrderNotification) -> bool:
    """Отправить уведомление о новом заказе"""
    try:
        bot = get_bot()
        
        message = f"""
✅ <b>Заказ принят!</b>

📦 Номер заказа: <b>#{data.orderNumber}</b>

👋 {data.customerName}, спасибо за заказ!

💰 Сумма: <b>{data.total:,.0f} ₽</b>

Мы свяжемся с вами для подтверждения деталей.

🔔 Уведомления о статусе будут приходить сюда.
        """.strip()

        await bot.send_message(
            chat_id=data.telegramId,
            text=message,
            parse_mode=ParseMode.HTML,
            reply_markup=get_order_keyboard(data.orderNumber)
        )
        
        logger.info(f"Order notification sent to {data.telegramId} for order #{data.orderNumber}")
        return True
        
    except TelegramError as e:
        logger.error(f"Failed to send order notification: {e}")
        return False

async def send_status_notification(data: StatusNotification) -> bool:
    """Отправить уведомление об изменении статуса"""
    try:
        bot = get_bot()
        
        emoji = get_status_emoji(data.status)
        status_text = data.statusText or get_status_text(data.status)
        
        message = f"""
{emoji} <b>Обновление заказа</b>

📦 Заказ: <b>#{data.orderNumber}</b>
📋 Статус: <b>{status_text}</b>

Следите за обновлениями здесь!
        """.strip()

        # Дополнительный текст в зависимости от статуса
        if data.status.upper() == 'SHIPPED':
            message += "\n\n🚚 Ваш заказ в пути! Ожидайте доставку."
        elif data.status.upper() == 'DELIVERED':
            message += "\n\n🎉 Спасибо за покупку! Будем рады видеть вас снова."
        elif data.status.upper() == 'CANCELLED':
            message += "\n\n❓ Если у вас есть вопросы, свяжитесь с нами."

        await bot.send_message(
            chat_id=data.telegramId,
            text=message,
            parse_mode=ParseMode.HTML,
            reply_markup=get_order_keyboard(data.orderNumber)
        )
        
        logger.info(f"Status notification sent to {data.telegramId} for order #{data.orderNumber}")
        return True
        
    except TelegramError as e:
        logger.error(f"Failed to send status notification: {e}")
        return False

async def send_cart_reminder(data: AbandonedCartNotification) -> bool:
    """Отправить напоминание о брошенной корзине"""
    try:
        bot = get_bot()
        
        days_text = f"{data.daysSinceAbandoned} дн." if data.daysSinceAbandoned > 0 else "недавно"
        
        message = f"""
🛒 <b>Вы кое-что забыли!</b>

Вы добавили товары в корзину {days_text} назад.

📦 <b>В корзине:</b>
{data.items}

💰 <b>Итого:</b> {data.totalAmount:,.0f} ₽

Завершите покупку, пока товары в наличии! 🔥
        """.strip()

        await bot.send_message(
            chat_id=data.telegramId,
            text=message,
            parse_mode=ParseMode.HTML,
            reply_markup=get_cart_reminder_keyboard(data.cartId)
        )
        
        logger.info(f"Cart reminder sent to {data.telegramId} for cart #{data.cartId}")
        return True
        
    except TelegramError as e:
        logger.error(f"Failed to send cart reminder: {e}")
        return False

async def send_custom_notification(data: CustomNotification) -> bool:
    """Отправить кастомное уведомление"""
    try:
        bot = get_bot()
        
        keyboard = None
        if data.buttons:
            keyboard_buttons = []
            for btn in data.buttons:
                if btn.get('url'):
                    keyboard_buttons.append([
                        InlineKeyboardButton(btn['text'], url=btn['url'])
                    ])
                elif btn.get('callback'):
                    keyboard_buttons.append([
                        InlineKeyboardButton(btn['text'], callback_data=btn['callback'])
                    ])
            if keyboard_buttons:
                keyboard = InlineKeyboardMarkup(keyboard_buttons)

        await bot.send_message(
            chat_id=data.telegramId,
            text=data.message,
            parse_mode=ParseMode.HTML,
            reply_markup=keyboard
        )
        
        logger.info(f"Custom notification sent to {data.telegramId}")
        return True
        
    except TelegramError as e:
        logger.error(f"Failed to send custom notification: {e}")
        return False

# ============================================
# FastAPI Application
# ============================================
# ============================================
# Error Handler
# ============================================
async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Глобальный обработчик ошибок бота"""
    error = context.error
    
    # Логируем ошибку
    if isinstance(error, Forbidden):
        # Пользователь заблокировал бота
        logger.warning(f"User blocked bot: {error}")
    elif isinstance(error, BadRequest):
        # Неверный запрос (например, сообщение слишком длинное)
        logger.error(f"Bad request: {error}")
    elif isinstance(error, TimedOut):
        # Таймаут запроса
        logger.warning(f"Request timed out: {error}")
    elif isinstance(error, NetworkError):
        # Проблема с сетью
        logger.error(f"Network error: {error}")
    else:
        # Другие ошибки
        logger.exception(f"Unexpected error: {error}")
    
    # Пытаемся уведомить пользователя (если возможно)
    if update and hasattr(update, 'effective_message') and update.effective_message:
        try:
            await update.effective_message.reply_text(
                "😔 Произошла ошибка. Попробуйте позже или свяжитесь с поддержкой."
            )
        except Exception:
            pass  # Игнорируем ошибки при отправке сообщения об ошибке

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager для FastAPI"""
    global application
    
    # Startup
    logger.info("🚀 Starting Customer Bot...")
    
    if BOT_TOKEN:
        application = Application.builder().token(BOT_TOKEN).build()
        
        # Добавляем обработчики
        application.add_handler(CommandHandler("start", start_command))
        application.add_handler(CommandHandler("help", help_command))
        application.add_handler(CommandHandler("orders", orders_command))
        application.add_handler(CommandHandler("contacts", contacts_command))
        application.add_handler(CallbackQueryHandler(callback_handler))
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, message_handler))
        
        # Добавляем глобальный error handler
        application.add_error_handler(error_handler)
        
        # Инициализируем приложение
        await application.initialize()
        await application.start()
        
        if USE_WEBHOOK and WEBHOOK_URL:
            # Webhook режим
            await application.bot.set_webhook(url=f"{WEBHOOK_URL}/webhook")
            logger.info(f"Webhook set to {WEBHOOK_URL}/webhook")
        else:
            # Polling режим (в фоне)
            await application.updater.start_polling(drop_pending_updates=True)
            logger.info("Polling started")
    
    yield
    
    # Shutdown
    if application:
        if USE_WEBHOOK:
            await application.bot.delete_webhook()
        else:
            await application.updater.stop()
        await application.stop()
        await application.shutdown()
    
    logger.info("Customer Bot stopped")

# Создаём FastAPI приложение
api = FastAPI(
    title="Customer Bot API",
    version="2.0.0",
    lifespan=lifespan
)

# ============================================
# API Endpoints
# ============================================
@api.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "bot_initialized": application is not None,
        "version": "2.0.0",
        "mode": "webhook" if USE_WEBHOOK else "polling"
    }

@api.post("/webhook")
async def webhook(request: Request):
    """Webhook endpoint для Telegram"""
    if not application:
        raise HTTPException(status_code=503, detail="Bot not initialized")
    
    try:
        data = await request.json()
        update = Update.de_json(data, application.bot)
        await application.process_update(update)
        return JSONResponse({"ok": True})
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api.post("/notify/customer")
async def notify_customer(data: OrderNotification, background_tasks: BackgroundTasks):
    """Отправить уведомление клиенту о новом заказе"""
    background_tasks.add_task(send_order_notification, data)
    return {"status": "queued", "message": "Notification will be sent"}

@api.post("/notify/status")
async def notify_status(data: StatusNotification, background_tasks: BackgroundTasks):
    """Отправить уведомление об изменении статуса"""
    background_tasks.add_task(send_status_notification, data)
    return {"status": "queued", "message": "Status notification will be sent"}

@api.post("/notify/abandoned-cart")
async def notify_abandoned_cart(data: AbandonedCartNotification, background_tasks: BackgroundTasks):
    """Отправить напоминание о брошенной корзине"""
    background_tasks.add_task(send_cart_reminder, data)
    return {"status": "queued", "message": "Cart reminder will be sent"}

@api.post("/notify/custom")
async def notify_custom(data: CustomNotification, background_tasks: BackgroundTasks):
    """Отправить кастомное уведомление"""
    background_tasks.add_task(send_custom_notification, data)
    return {"status": "queued", "message": "Custom notification will be sent"}

@api.post("/broadcast")
async def broadcast(request: Request):
    """Рассылка сообщений (для админов)"""
    # TODO: Добавить авторизацию
    data = await request.json()
    user_ids = data.get('userIds', [])
    message = data.get('message', '')
    
    if not user_ids or not message:
        raise HTTPException(status_code=400, detail="userIds and message required")
    
    results = {"sent": 0, "failed": 0}
    
    for user_id in user_ids:
        try:
            await send_custom_notification(CustomNotification(
                telegramId=str(user_id),
                message=message
            ))
            results["sent"] += 1
        except Exception:
            results["failed"] += 1
    
    return results

# ============================================
# Main
# ============================================
if __name__ == '__main__':
    uvicorn.run(
        "customer_bot_v2:api",
        host="0.0.0.0",
        port=PORT,
        reload=False,
        log_level="info"
    )
