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

# Логирование настроек админов
if ADMIN_CHAT_ID:
    logger.info(f'✅ Admin chat ID: {ADMIN_CHAT_ID}')
elif ADMIN_CHAT_ID_RAW:
    if ADMIN_CHAT_ID_RAW in DEFAULT_PLACEHOLDER_IDS:
        logger.info(f'ℹ️  ADMIN_CHAT_ID="{ADMIN_CHAT_ID_RAW}" is default placeholder - IGNORED')
    else:
        logger.warning(f'⚠️ ADMIN_CHAT_ID="{ADMIN_CHAT_ID_RAW}" is invalid')
else:
    logger.info('ℹ️  ADMIN_CHAT_ID not set (will use ADMIN_WHITELIST if available)')

if ADMIN_WHITELIST:
    logger.info(f'✅ Admin whitelist: {ADMIN_WHITELIST} (will be used for notifications)')
else:
    logger.warning('⚠️ ADMIN_WHITELIST not set or contains only default values')

# Проверяем финальную конфигурацию (будет выполнена после определения get_admin_ids())

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
# ВАЖНО: В Prisma используется PENDING, а не NEW
STATUSES = {
    'NEW': ('🆕', 'Новый', ['CONFIRMED', 'CANCELLED']),  # Для UI, маппится в PENDING
    'PENDING': ('🆕', 'Новый', ['CONFIRMED', 'CANCELLED']),
    'CONFIRMED': ('✅', 'Подтверждён', ['PROCESSING', 'CANCELLED']),
    'PROCESSING': ('🔄', 'В работе', ['SHIPPED', 'CANCELLED']),
    'SHIPPED': ('📦', 'Готов к выдаче', ['DELIVERED']),
    'DELIVERED': ('🎉', 'Выдан', []),
    'CANCELLED': ('❌', 'Отменён', []),
}

# Маппинг статусов для API (NEW -> PENDING)
def map_status_to_api(status: str) -> str:
    """Преобразует статус из UI в статус для API"""
    if status == 'NEW':
        return 'PENDING'
    return status

# Список ID админов для уведомлений (из ADMIN_WHITELIST или ADMIN_CHAT_ID)
def get_admin_ids() -> list:
    """Получить список ID админов для отправки уведомлений"""
    admin_ids = []
    
    # ВАЖНО: ADMIN_WHITELIST имеет приоритет над ADMIN_CHAT_ID
    # Если ADMIN_WHITELIST установлен, используем только его
    
    # Сначала добавляем из ADMIN_WHITELIST (приоритет)
    if ADMIN_WHITELIST:
        logger.info(f"📋 Using ADMIN_WHITELIST: {ADMIN_WHITELIST}")
        for admin_id in ADMIN_WHITELIST:
            try:
                admin_id_int = int(admin_id)
                # Проверяем, что это не дефолтное значение
                if str(admin_id_int) not in DEFAULT_PLACEHOLDER_IDS:
                    if admin_id_int not in admin_ids:
                        admin_ids.append(admin_id_int)
                        logger.debug(f"✅ Added admin ID from whitelist: {admin_id_int}")
                else:
                    logger.warning(f"⚠️ Skipping default placeholder ID from whitelist: {admin_id}")
            except ValueError:
                logger.warning(f"⚠️ Invalid admin ID in whitelist: {admin_id}")
    
    # Если ADMIN_WHITELIST пуст, используем ADMIN_CHAT_ID (только если не дефолтный)
    if not admin_ids and ADMIN_CHAT_ID:
        logger.info(f"📋 ADMIN_WHITELIST empty, using ADMIN_CHAT_ID: {ADMIN_CHAT_ID}")
        try:
            chat_id = int(ADMIN_CHAT_ID)
            if str(chat_id) not in DEFAULT_PLACEHOLDER_IDS:
                admin_ids.append(chat_id)
                logger.debug(f"✅ Added admin ID from ADMIN_CHAT_ID: {chat_id}")
            else:
                logger.warning(f"⚠️ Skipping default placeholder ADMIN_CHAT_ID: {ADMIN_CHAT_ID}")
        except ValueError:
            logger.warning(f"⚠️ Invalid ADMIN_CHAT_ID: {ADMIN_CHAT_ID}")
    
    # Логируем финальный список с детальной информацией
    if admin_ids:
        logger.info(f"✅ Final admin IDs to notify: {admin_ids} (types: {[type(id).__name__ for id in admin_ids]})")
        logger.info(f"   Total count: {len(admin_ids)}")
        for idx, admin_id in enumerate(admin_ids, 1):
            logger.info(f"   [{idx}] Admin ID: {admin_id} (type: {type(admin_id).__name__}, value: {repr(admin_id)})")
    else:
        logger.error("❌ No valid admin IDs found! Check ADMIN_WHITELIST or ADMIN_CHAT_ID")
        logger.error(f"   ADMIN_WHITELIST_RAW: '{ADMIN_WHITELIST_RAW}'")
        logger.error(f"   ADMIN_CHAT_ID_RAW: '{ADMIN_CHAT_ID_RAW}'")
        logger.error(f"   ADMIN_CHAT_ID (after filter): {ADMIN_CHAT_ID}")
        logger.error(f"   ADMIN_WHITELIST (after filter): {ADMIN_WHITELIST}")
    
    return admin_ids

# Проверяем финальную конфигурацию (после определения get_admin_ids)
final_admin_ids = get_admin_ids()
if final_admin_ids:
    logger.info(f'✅ Final configuration: {len(final_admin_ids)} admin(s) will receive notifications: {final_admin_ids}')
    logger.info(f'   Types: {[type(id).__name__ for id in final_admin_ids]}')
    logger.info(f'   Values: {[repr(id) for id in final_admin_ids]}')
    for idx, admin_id in enumerate(final_admin_ids, 1):
        logger.info(f'   [{idx}] Admin ID: {admin_id} (type: {type(admin_id).__name__}, value: {repr(admin_id)})')
else:
    logger.error('❌ CRITICAL: No valid admin IDs configured! Notifications will fail!')
    logger.error(f'   ADMIN_WHITELIST_RAW: "{ADMIN_WHITELIST_RAW}"')
    logger.error(f'   ADMIN_CHAT_ID_RAW: "{ADMIN_CHAT_ID_RAW}"')
    logger.error(f'   ADMIN_CHAT_ID (after filter): {ADMIN_CHAT_ID}')

application: Optional[Application] = None

def get_bot() -> Bot:
    return application.bot if application else Bot(token=BOT_TOKEN)

def is_admin(user_id: int) -> bool:
    return str(user_id) == str(ADMIN_CHAT_ID) or str(user_id) in ADMIN_WHITELIST

def order_keyboard(order_num: str, status: str = 'NEW') -> InlineKeyboardMarkup:
    kb = []
    # Нормализуем статус (NEW -> PENDING для получения следующих статусов)
    normalized_status = map_status_to_api(status.upper())
    _, _, next_statuses = STATUSES.get(normalized_status, STATUSES['PENDING'])
    btns = []
    for s in next_statuses:
        emoji, text, _ = STATUSES.get(s, ('📋', s, []))
        btns.append(InlineKeyboardButton(f"{emoji} {text}", callback_data=f"st_{order_num}_{s}"))
    for i in range(0, len(btns), 2):
        kb.append(btns[i:i+2])
    # Кнопка "Детали" без контекста (будет возвращать на "orders")
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
    
    await q.answer()  # Отвечаем на callback сразу
    data = q.data
    
    try:
        if data == "main":
            await q.edit_message_text(
                "🏠 <b>Меню</b>\n\nВыберите действие:",
                parse_mode=ParseMode.HTML,
                reply_markup=main_keyboard()
            )
        elif data == "stats":
            # Получить статистику
            try:
                async with aiohttp.ClientSession() as session:
                    api_key = os.getenv('BOT_API_KEY') or os.getenv('JWT_SECRET', '')
                    headers = {
                        'X-Bot-API-Key': api_key,
                        'Content-Type': 'application/json',
                    }
                    
                    # Получаем все заказы для подсчета статистики
                    url = f"{API_URL}/bots/orders"
                    logger.info(f"Fetching all orders for statistics from {url}")
                    
                    async with session.get(url, headers=headers) as resp:
                        if resp.status == 200:
                            all_orders = await resp.json()
                            if not isinstance(all_orders, list):
                                all_orders = []
                            
                            # Подсчитываем статистику
                            total_orders = len(all_orders)
                            pending_count = sum(1 for o in all_orders if o.get('status') == 'PENDING')
                            confirmed_count = sum(1 for o in all_orders if o.get('status') == 'CONFIRMED')
                            processing_count = sum(1 for o in all_orders if o.get('status') == 'PROCESSING')
                            shipped_count = sum(1 for o in all_orders if o.get('status') == 'SHIPPED')
                            delivered_count = sum(1 for o in all_orders if o.get('status') == 'DELIVERED')
                            cancelled_count = sum(1 for o in all_orders if o.get('status') == 'CANCELLED')
                            
                            # Подсчитываем выручку (только оплаченные заказы)
                            total_revenue = 0.0
                            paid_orders = 0
                            for o in all_orders:
                                if o.get('paymentStatus') == 'PAID':
                                    try:
                                        total_revenue += float(o.get('total', 0))
                                        paid_orders += 1
                                    except (ValueError, TypeError):
                                        pass
                            
                            # Заказы за сегодня
                            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                            today_orders = 0
                            for o in all_orders:
                                if o.get('createdAt'):
                                    try:
                                        # Парсим дату (может быть в разных форматах)
                                        created_str = o.get('createdAt', '')
                                        if 'T' in created_str:
                                            # ISO format: 2025-11-28T19:52:00.222Z
                                            if created_str.endswith('Z'):
                                                created_str = created_str[:-1] + '+00:00'
                                            order_date = datetime.fromisoformat(created_str).replace(tzinfo=None)
                                        else:
                                            # Другой формат, пропускаем
                                            continue
                                        
                                        if order_date >= today_start:
                                            today_orders += 1
                                    except (ValueError, TypeError, AttributeError) as e:
                                        logger.debug(f"Error parsing date {o.get('createdAt')}: {e}")
                                        continue
                            
                            today_revenue = 0.0
                            for o in all_orders:
                                if o.get('paymentStatus') == 'PAID' and o.get('createdAt'):
                                    try:
                                        created_str = o.get('createdAt', '')
                                        if 'T' in created_str:
                                            if created_str.endswith('Z'):
                                                created_str = created_str[:-1] + '+00:00'
                                            order_date = datetime.fromisoformat(created_str).replace(tzinfo=None)
                                        else:
                                            continue
                                        
                                        if order_date >= today_start:
                                            today_revenue += float(o.get('total', 0))
                                    except (ValueError, TypeError, AttributeError):
                                        pass
                            
                            stats_msg = f"""📊 <b>Статистика</b>

📦 <b>Всего заказов:</b> {total_orders}
💰 <b>Выручка (оплачено):</b> {total_revenue:,.0f} ₽
💳 <b>Оплачено заказов:</b> {paid_orders}

📅 <b>Сегодня:</b>
  • Заказов: {today_orders}
  • Выручка: {today_revenue:,.0f} ₽

📊 <b>По статусам:</b>
  🆕 Новые: {pending_count}
  ✅ Подтверждённые: {confirmed_count}
  🔄 В работе: {processing_count}
  📦 Готов к выдаче: {shipped_count}
  🎉 Выдан: {delivered_count}
  ❌ Отменён: {cancelled_count}
                            """.strip()
                            
                            await q.edit_message_text(
                                stats_msg,
                                parse_mode=ParseMode.HTML,
                                reply_markup=InlineKeyboardMarkup([
                                    [InlineKeyboardButton("🔄 Обновить", callback_data="stats")],
                                    [InlineKeyboardButton("◀️ Назад", callback_data="main")]
                                ])
                            )
                        else:
                            error_text = await resp.text()
                            logger.error(f"API error fetching stats: {resp.status} - {error_text}")
                            await q.edit_message_text(
                                f"❌ Ошибка загрузки статистики: {resp.status}",
                                parse_mode=ParseMode.HTML,
                                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("◀️ Назад", callback_data="main")]])
                            )
            except Exception as e:
                logger.exception(f"Error fetching statistics: {e}")
                await q.edit_message_text(
                    f"❌ Ошибка: {str(e)}",
                    parse_mode=ParseMode.HTML,
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("◀️ Назад", callback_data="main")]])
                )
        elif data == "orders":
            await q.edit_message_text(
                "📦 <b>Заказы</b>\n\nВыберите статус:",
                parse_mode=ParseMode.HTML,
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("🆕 Новые", callback_data="ord_NEW")],
                    [InlineKeyboardButton("✅ Подтверждённые", callback_data="ord_CONFIRMED")],
                    [InlineKeyboardButton("🔄 В работе", callback_data="ord_PROCESSING")],
                    [InlineKeyboardButton("📦 Готов к выдаче", callback_data="ord_SHIPPED")],
                    [InlineKeyboardButton("◀️ Назад", callback_data="main")]
                ])
            )
        elif data.startswith("ord_"):
            # Показать заказы по статусу
            status = data.replace("ord_", "")
            # Маппим NEW -> PENDING для API
            api_status = map_status_to_api(status)
            emoji, text, _ = STATUSES.get(status, STATUSES.get(api_status, ('📋', status, [])))
            
            try:
                async with aiohttp.ClientSession() as session:
                    # Используем JWT_SECRET как API ключ (fallback на BOT_API_KEY если есть)
                    api_key = os.getenv('BOT_API_KEY') or os.getenv('JWT_SECRET', '')
                    headers = {
                        'X-Bot-API-Key': api_key,
                        'Content-Type': 'application/json',
                    }
                    url = f"{API_URL}/bots/orders?status={api_status}"
                    
                    logger.info(f"Fetching orders with status={status} from {url}")
                    logger.debug(f"API key: {api_key[:10]}...{api_key[-5:] if len(api_key) > 15 else '***'}")
                    
                    async with session.get(url, headers=headers) as resp:
                        response_text = await resp.text()
                        logger.info(f"API response status: {resp.status}, content-type: {resp.headers.get('content-type', 'unknown')}")
                        
                        if resp.status == 200:
                            try:
                                orders = await resp.json() if response_text else []
                            except Exception as json_error:
                                logger.error(f"Failed to parse JSON response: {json_error}, response: {response_text[:500]}")
                                orders = []
                            
                            logger.info(f"Received {len(orders) if orders else 0} orders")
                            
                            # Проверяем, что orders - это массив
                            if not isinstance(orders, list):
                                logger.error(f"Expected list, got {type(orders)}: {orders}")
                                orders = []
                            
                            if orders and len(orders) > 0:
                                orders_buttons = []
                                orders_text = ""
                                
                                for o in orders[:10]:  # Показываем первые 10
                                    order_num = o.get('orderNumber', 'N/A')
                                    customer_name = o.get('customerName', 'N/A')
                                    # Конвертируем total в float (может быть строкой из Decimal)
                                    try:
                                        total = float(o.get('total', 0))
                                    except (ValueError, TypeError):
                                        total = 0.0
                                    
                                    orders_text += f"• #{order_num} - {customer_name} - {total:,.0f} ₽\n"
                                    # Добавляем кнопку для каждого заказа
                                    orders_buttons.append([
                                        InlineKeyboardButton(
                                            f"#{order_num} - {customer_name[:20]}",
                                            callback_data=f"det_{order_num}_ord_{status}"
                                        )
                                    ])
                                
                                if len(orders) > 10:
                                    orders_text += f"\n... и ещё {len(orders) - 10} заказов"
                                
                                msg = f"📦 <b>{emoji} {text}</b>\n\n{orders_text}"
                                
                                # Добавляем кнопку "Назад"
                                orders_buttons.append([InlineKeyboardButton("◀️ Назад", callback_data="orders")])
                                
                                await q.edit_message_text(
                                    msg,
                                    parse_mode=ParseMode.HTML,
                                    reply_markup=InlineKeyboardMarkup(orders_buttons)
                                )
                            else:
                                await q.edit_message_text(
                                    f"📦 <b>{emoji} {text}</b>\n\nЗаказы не найдены",
                                    parse_mode=ParseMode.HTML,
                                    reply_markup=InlineKeyboardMarkup([
                                        [InlineKeyboardButton("◀️ Назад", callback_data="orders")]
                                    ])
                                )
                        else:
                            logger.error(f"API error: {resp.status} - {response_text[:500]}")
                            
                            # Формируем понятное сообщение об ошибке
                            if resp.status == 401:
                                error_msg = "❌ Ошибка авторизации API. Проверьте BOT_API_KEY или JWT_SECRET."
                            elif resp.status == 500:
                                error_msg = f"❌ Ошибка сервера (500). Проверьте логи API.\n\n{response_text[:150]}"
                            else:
                                error_msg = f"❌ Ошибка {resp.status}: {response_text[:150]}"
                            
                            await q.edit_message_text(
                                error_msg,
                                parse_mode=ParseMode.HTML,
                                reply_markup=InlineKeyboardMarkup([
                                    [InlineKeyboardButton("◀️ Назад", callback_data="orders")]
                                ])
                            )
            except Exception as e:
                logger.exception(f"Error fetching orders: {e}")
                await q.edit_message_text(
                    f"❌ Ошибка: {str(e)}",
                    parse_mode=ParseMode.HTML,
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("◀️ Назад", callback_data="orders")]])
                )
        elif data.startswith("st_"):
            # Обновление статуса заказа
            parts = data.split("_")
            if len(parts) >= 3:
                order_num, new_status = parts[1], parts[2]
                # Маппим NEW -> PENDING для API
                api_status = map_status_to_api(new_status)
                emoji, text, _ = STATUSES.get(new_status, STATUSES.get(api_status, ('📋', new_status, [])))
                
                try:
                    async with aiohttp.ClientSession() as session:
                        api_key = os.getenv('BOT_API_KEY') or os.getenv('JWT_SECRET', '')
                        headers = {
                            'X-Bot-API-Key': api_key,
                            'Content-Type': 'application/json',
                        }
                        url = f"{API_URL}/bots/orders/number/{order_num}/status"
                        payload = {"status": api_status}
                        
                        async with session.patch(url, json=payload, headers=headers) as resp:
                            if resp.status == 200:
                                order_data = await resp.json()
                                await q.answer(f"✅ Статус изменён на: {text}", show_alert=True)
                                
                                # Обновляем клавиатуру с новым статусом (используем оригинальный статус для UI)
                                new_keyboard = order_keyboard(order_num, new_status if new_status != 'PENDING' else 'NEW')
                                await q.edit_message_reply_markup(reply_markup=new_keyboard)
                            else:
                                error_text = await resp.text()
                                logger.error(f"API error updating status: {resp.status} - {error_text}")
                                await q.answer(f"❌ Ошибка: {resp.status}", show_alert=True)
                except Exception as e:
                    logger.exception(f"Error updating order status: {e}")
                    await q.answer(f"❌ Ошибка: {str(e)}", show_alert=True)
        elif data.startswith("det_"):
            # Показать детали заказа
            # Формат: det_ORD-123 или det_ORD-123_ord_NEW (с контекстом возврата)
            parts = data.split("_")
            order_num = parts[1] if len(parts) > 1 else data.replace("det_", "")
            return_context = None
            
            # Проверяем, есть ли контекст возврата (det_ORD-123_ord_NEW)
            if len(parts) >= 4 and parts[2] == "ord":
                return_context = f"ord_{parts[3]}"
            
            try:
                async with aiohttp.ClientSession() as session:
                    api_key = os.getenv('BOT_API_KEY') or os.getenv('JWT_SECRET', '')
                    headers = {
                        'X-Bot-API-Key': api_key,
                        'Content-Type': 'application/json',
                    }
                    url = f"{API_URL}/bots/orders/number/{order_num}"
                    
                    logger.info(f"Fetching order details for {order_num}")
                    logger.debug(f"API key: {api_key[:10]}...{api_key[-5:] if len(api_key) > 15 else '***'}")
                    
                    async with session.get(url, headers=headers) as resp:
                        response_text = await resp.text()
                        logger.info(f"API response status: {resp.status}")
                        
                        if resp.status == 200:
                            order = await resp.json()
                            
                            # Формируем список товаров с безопасным преобразованием типов
                            items_text = ""
                            for item in order.get('items', []):
                                product_name = item.get('productName', 'N/A')
                                variant_name = item.get('variantName', '') or ''
                                quantity = item.get('quantity', 0)
                                
                                # Конвертируем price в float (может быть строкой из Decimal)
                                try:
                                    price = float(item.get('price', 0))
                                except (ValueError, TypeError):
                                    price = 0.0
                                
                                variant_str = f" ({variant_name})" if variant_name else ""
                                items_text += f"  • {product_name}{variant_str} - {quantity} шт. × {price:,.0f} ₽\n"
                            
                            if not items_text:
                                items_text = "  (нет товаров)"
                            
                            # Нормализуем статус для отображения (PENDING -> NEW для UI)
                            order_status = order.get('status', 'PENDING')
                            if order_status == 'PENDING':
                                status_emoji, status_text, _ = STATUSES.get('NEW', STATUSES['PENDING'])
                            else:
                                status_emoji, status_text, _ = STATUSES.get(order_status, ('📋', order_status, []))
                            
                            # Конвертируем total в float (может быть строкой из Decimal)
                            try:
                                total = float(order.get('total', 0))
                            except (ValueError, TypeError):
                                total = 0.0
                            
                            customer_email = order.get('customerEmail', '') or ''
                            customer_address = order.get('customerAddress', '') or ''
                            comment = order.get('comment', '') or ''
                            
                            msg = f"""📦 <b>Заказ #{order.get('orderNumber', 'N/A')}</b>

👤 <b>Клиент:</b>
{order.get('customerName', 'N/A')}
📱 {order.get('customerPhone', 'N/A')}
{f"📧 {customer_email}" if customer_email else ''}
{f"📍 {customer_address}" if customer_address else ''}

📦 <b>Товары:</b>
{items_text.strip()}

💰 <b>Сумма:</b> {total:,.0f} ₽

📊 <b>Статус:</b> {status_emoji} {status_text}
💳 <b>Оплата:</b> {'✅ Оплачен' if order.get('paymentStatus') == 'PAID' else '⏳ Не оплачен'}

{f"💬 <b>Комментарий:</b> {comment}" if comment else ''}
                            """.strip()
                            
                            # Определяем callback для кнопки "Назад"
                            back_callback = return_context if return_context else "orders"
                            
                            await q.edit_message_text(
                                msg,
                                parse_mode=ParseMode.HTML,
                                reply_markup=InlineKeyboardMarkup([
                                    [InlineKeyboardButton("◀️ Назад", callback_data=back_callback)]
                                ])
                            )
                        else:
                            logger.error(f"API error: {resp.status} - {response_text[:500]}")
                            
                            # Формируем понятное сообщение об ошибке
                            if resp.status == 401:
                                error_msg = "❌ Ошибка авторизации API. Проверьте BOT_API_KEY или JWT_SECRET."
                            elif resp.status == 404:
                                error_msg = f"❌ Заказ #{order_num} не найден."
                            elif resp.status == 500:
                                error_msg = f"❌ Ошибка сервера (500). Проверьте логи API.\n\n{response_text[:150]}"
                            else:
                                error_msg = f"❌ Ошибка {resp.status}: {response_text[:150]}"
                            
                            back_callback = return_context if return_context else "orders"
                            await q.edit_message_text(
                                error_msg,
                                parse_mode=ParseMode.HTML,
                                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("◀️ Назад", callback_data=back_callback)]])
                            )
            except Exception as e:
                logger.exception(f"Error fetching order details: {e}")
                back_callback = return_context if return_context else "orders"
                await q.edit_message_text(
                    f"❌ Ошибка: {str(e)}",
                    parse_mode=ParseMode.HTML,
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("◀️ Назад", callback_data=back_callback)]])
                )
        else:
            await q.answer("❓ Неизвестная команда", show_alert=True)
    except Exception as e:
        logger.exception(f"Error in callback handler: {e}")
        await q.answer(f"❌ Ошибка: {str(e)}", show_alert=True)

# Notifications
async def send_order_notification(data: OrderNotification) -> bool:
    """Отправить уведомление о новом заказе ВСЕМ админам из ADMIN_WHITELIST"""
    logger.info("=" * 60)
    logger.info(f"🔄 Processing order notification for #{data.orderNumber}")
    logger.info(f"   Order ID: {data.orderId}")
    logger.info(f"   Customer: {data.customerName} ({data.customerPhone})")
    logger.info(f"   Total: {data.total:,.0f} ₽")
    
    # Получаем список админов (с логированием внутри функции)
    logger.info("📋 Getting admin IDs from get_admin_ids()...")
    admin_ids = get_admin_ids()
    
    logger.info(f"📋 Admin IDs to notify (final): {admin_ids} (count: {len(admin_ids)})")
    logger.info(f"   Types: {[type(id).__name__ for id in admin_ids]}")
    logger.info(f"   Values: {[repr(id) for id in admin_ids]}")
    
    if not admin_ids:
        logger.error("❌ No admin IDs configured - cannot send notification")
        logger.error("   Set ADMIN_WHITELIST or ADMIN_CHAT_ID in environment")
        return False
    
    if not BOT_TOKEN:
        logger.error("❌ BOT_TOKEN not set - cannot send notification")
        return False
    
    logger.info(f"🔑 BOT_TOKEN: {BOT_TOKEN[:10]}...{BOT_TOKEN[-5:]} (length: {len(BOT_TOKEN)})")
    
    try:
        bot = get_bot()
        if not bot:
            logger.error("❌ Bot not initialized")
            return False
        
        logger.info(f"🤖 Bot initialized: {bot.username if hasattr(bot, 'username') else 'N/A'} (ID: {bot.id if hasattr(bot, 'id') else 'N/A'})")
        
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
                # Убеждаемся, что admin_id - это int (не строка)
                if isinstance(admin_id, str):
                    try:
                        admin_id = int(admin_id)
                        logger.warning(f"⚠️ Converted admin_id from string to int: {admin_id}")
                    except ValueError:
                        logger.error(f"❌ Admin ID '{admin_id}' is not a valid integer!")
                        failed_count += 1
                        continue
                
                logger.info(f"📤 Attempting to send notification to admin {admin_id} (type: {type(admin_id).__name__}, value: {repr(admin_id)})")
                
                # Проверяем, может ли бот писать пользователю (получаем информацию о чате)
                try:
                    chat = await bot.get_chat(chat_id=admin_id)
                    logger.info(f"✅ Chat info retrieved for {admin_id}: type={chat.type if hasattr(chat, 'type') else 'user'}, id={chat.id if hasattr(chat, 'id') else 'N/A'}")
                except Forbidden as e:
                    logger.error(f"❌ Admin {admin_id}: Bot is blocked or user hasn't started the bot. Error: {e}")
                    logger.error(f"   💡 User {admin_id} MUST send /start to the bot first!")
                    failed_count += 1
                    continue
                except BadRequest as e:
                    error_msg = str(e)
                    logger.error(f"❌ Admin {admin_id}: BadRequest error: {error_msg}")
                    if "chat not found" in error_msg.lower():
                        logger.error(f"   💡 Chat not found - user {admin_id} may not have started the bot or ID is incorrect")
                        logger.error(f"   💡 Try: User should send /start to the bot first")
                    failed_count += 1
                    continue
                
                # Отправляем сообщение (используем 'NEW' для UI, но API будет использовать PENDING)
                logger.info(f"📨 Sending message to chat_id={admin_id} (type: {type(admin_id).__name__})")
                await bot.send_message(
                    chat_id=admin_id, 
                    text=msg, 
                    parse_mode=ParseMode.HTML,
                    reply_markup=order_keyboard(data.orderNumber, 'NEW')  # NEW для UI, маппится в PENDING в API
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
    """Отправить уведомление об изменении статуса заказа ВСЕМ админам"""
    admin_ids = get_admin_ids()
    
    if not admin_ids:
        logger.error("❌ No admin IDs configured - cannot send status notification")
        return False
    
    if not BOT_TOKEN:
        logger.error("❌ BOT_TOKEN not set - cannot send notification")
        return False
    
    try:
        bot = get_bot()
        if not bot:
            logger.error("❌ Bot not initialized")
            return False
        
        e1, t1, _ = STATUSES.get(data.oldStatus.upper() if data.oldStatus else 'NEW', ('📋', '?', []))
        e2, t2, _ = STATUSES.get(data.status.upper(), ('📋', data.status, []))
        msg = f"🔄 <b>Статус изменён</b>\n\n#{data.orderNumber}\n{e1} {t1} → {e2} {t2}"
        
        success_count = 0
        for admin_id in admin_ids:
            try:
                await bot.send_message(chat_id=admin_id, text=msg, parse_mode=ParseMode.HTML)
                logger.info(f"✅ Status notification sent to admin {admin_id}")
                success_count += 1
            except (Forbidden, BadRequest) as e:
                logger.error(f"❌ Admin {admin_id}: Cannot send status notification - {e}")
            except TelegramError as e:
                logger.error(f"❌ Admin {admin_id}: Telegram error: {e}")
        
        return success_count > 0
    except Exception as e:
        logger.exception(f"❌ Unexpected error sending status notification: {e}")
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
    
    # Проверяем, что есть админы для уведомления
    admin_ids = get_admin_ids()
    if not admin_ids:
        error_msg = "No valid admin IDs configured. Set ADMIN_WHITELIST or valid ADMIN_CHAT_ID"
        logger.error(f"❌ {error_msg}")
        logger.error(f"   ADMIN_WHITELIST_RAW: '{ADMIN_WHITELIST_RAW}'")
        logger.error(f"   ADMIN_CHAT_ID_RAW: '{ADMIN_CHAT_ID_RAW}'")
        raise HTTPException(status_code=500, detail=error_msg)
    
    logger.info(f"📤 Queuing notification to {len(admin_ids)} admin(s): {admin_ids}")
    bg.add_task(send_order_notification, data)
    return {"status": "queued", "orderNumber": data.orderNumber, "adminIds": admin_ids, "adminCount": len(admin_ids)}

@api.post("/notify/status")
async def notify_status(data: StatusNotification, bg: BackgroundTasks):
    bg.add_task(send_status_notification, data)
    return {"status": "queued"}

if __name__ == '__main__':
    uvicorn.run("admin_bot_v2:api", host="0.0.0.0", port=PORT, reload=False)
