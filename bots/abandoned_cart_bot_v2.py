#!/usr/bin/env python3
"""
Abandoned Cart Bot v2.0 - Автоматические напоминания о брошенных корзинах
Работает как фоновый сервис с планировщиком задач
"""

import os
import logging
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI
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
API_URL = os.getenv('API_URL', 'http://localhost:3000/api')
CUSTOMER_BOT_URL = os.getenv('CUSTOMER_BOT_API_URL', 'http://localhost:8001')
CHECK_INTERVAL_MINUTES = int(os.getenv('CART_CHECK_INTERVAL_MINUTES', '60'))
REMINDER_DELAY_HOURS = int(os.getenv('REMINDER_DELAY_HOURS', '2'))
MAX_REMINDERS = int(os.getenv('MAX_REMINDERS', '3'))
# Default intervals if API settings отсутствуют: 2h, 24h, 72h
REMINDER_INTERVALS = [2, 24, 72]
PORT = int(os.getenv('ABANDONED_CART_BOT_PORT', '8003'))

# Scheduler
scheduler = AsyncIOScheduler()

# Stats
stats = {
    'last_check': None,
    'carts_found': 0,
    'reminders_sent': 0,
    'errors': 0
}

class CartReminder(BaseModel):
    cart_id: int
    telegram_id: str
    items_text: str
    total_amount: float
    hours_since_abandoned: int
    reminder_count: int

async def api_get(endpoint: str) -> Optional[Dict]:
    """GET запрос к API"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_URL}{endpoint}", timeout=10) as resp:
                if resp.status == 200:
                    return await resp.json()
    except Exception as e:
        logger.error(f"API GET error: {e}")
    return None

async def api_post(url: str, data: Dict) -> bool:
    """POST запрос"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=data, timeout=10) as resp:
                return resp.status in [200, 201]
    except Exception as e:
        logger.error(f"API POST error: {e}")
    return False

async def get_abandoned_carts() -> List[Dict]:
    """Получить брошенные корзины из API"""
    result = await api_get('/admin/abandoned-carts')
    if result and 'carts' in result:
        return result['carts']
    return []

async def get_settings() -> Dict:
    """Получить настройки напоминаний"""
    result = await api_get('/admin/abandoned-carts/settings')
    settings = result or {}
    return {
        'autoRemindersEnabled': settings.get('autoRemindersEnabled', True),
        'reminderIntervalHours': settings.get('reminderIntervalHours', 24),
        'maxReminders': settings.get('maxReminders', MAX_REMINDERS),
        'initialDelayHours': settings.get('initialDelayHours', REMINDER_DELAY_HOURS),
        'reminderIntervals': settings.get('reminderIntervals', REMINDER_INTERVALS) or REMINDER_INTERVALS,
    }

async def send_reminder(telegram_id: str, cart: Dict) -> bool:
    """Отправить напоминание через Customer Bot"""
    items = cart.get('items', [])
    items_text = '\n'.join([
        f"  • {item.get('product', {}).get('name', 'Товар')} × {item.get('quantity', 1)}"
        for item in items
    ]) if items else "Товары в корзине"
    
    data = {
        'telegramId': telegram_id,
        'cartId': cart.get('id', 0),
        'items': items_text,
        'totalAmount': float(cart.get('totalAmount', 0)),
        'daysSinceAbandoned': cart.get('daysSinceAbandoned', 0)
    }
    
    return await api_post(f"{CUSTOMER_BOT_URL}/notify/abandoned-cart", data)

async def mark_reminder_sent(cart_id: int) -> bool:
    """Отметить напоминание как отправленное"""
    return await api_post(f"{API_URL}/admin/abandoned-carts/{cart_id}/mark-reminder-sent", {})

async def check_and_send_reminders():
    """Основная задача проверки и отправки напоминаний"""
    logger.info("🔍 Checking abandoned carts...")
    stats['last_check'] = datetime.now().isoformat()
    
    try:
        # Проверяем настройки
        settings = await get_settings()
        if not settings.get('autoRemindersEnabled', True):
            logger.info("Auto reminders disabled")
            return
        
        max_reminders = settings.get('maxReminders', MAX_REMINDERS)
        reminder_intervals = settings.get('reminderIntervals') or REMINDER_INTERVALS
        initial_delay = settings.get('initialDelayHours', REMINDER_DELAY_HOURS)
        
        # Получаем корзины
        carts = await get_abandoned_carts()
        stats['carts_found'] = len(carts)
        logger.info(f"Found {len(carts)} abandoned carts")
        
        sent_count = 0
        
        for cart in carts:
            try:
                # Пропускаем восстановленные
                if cart.get('recovered'):
                    continue
                
                # Проверяем telegram_id
                telegram_id = cart.get('telegramId')
                if not telegram_id:
                    continue
                
                reminder_sent = cart.get('reminderSent', 0)

                # Не превышаем общее число напоминаний
                if reminder_sent >= max_reminders:
                    continue

                # Проверяем интервалы:
                #  - первое напоминание — через initial_delay часов с момента abandon
                #  - последующие — по reminder_intervals[reminder_sent] (если есть)
                last_reminder = cart.get('lastReminderAt')
                abandoned_at = cart.get('abandonedAt') or cart.get('createdAt')

                # Если нет даты брошенной корзины — пропускаем
                if not abandoned_at:
                    continue

                try:
                    abandoned_dt = datetime.fromisoformat(abandoned_at.replace('Z', '+00:00'))
                    now_dt = datetime.now(abandoned_dt.tzinfo)
                except Exception:
                    continue

                # Определяем требуемый интервал для текущего напоминания
                if reminder_sent == 0:
                    required_hours = initial_delay
                    reference_dt = abandoned_dt
                else:
                    # Если интервала нет в списке — прекращаем
                    if reminder_sent - 1 >= len(reminder_intervals):
                        continue
                    required_hours = reminder_intervals[reminder_sent - 1]
                    if last_reminder:
                        try:
                            reference_dt = datetime.fromisoformat(last_reminder.replace('Z', '+00:00'))
                        except Exception:
                            continue
                    else:
                        reference_dt = abandoned_dt

                hours_since = (now_dt - reference_dt).total_seconds() / 3600
                if hours_since < required_hours:
                    continue
                
                # Отправляем напоминание
                if await send_reminder(telegram_id, cart):
                    if await mark_reminder_sent(cart.get('id')):
                        sent_count += 1
                        logger.info(f"✅ Reminder sent for cart #{cart.get('id')}")
                    
            except Exception as e:
                logger.error(f"Error processing cart {cart.get('id')}: {e}")
                stats['errors'] += 1
        
        stats['reminders_sent'] += sent_count
        logger.info(f"📤 Sent {sent_count} reminders")
        
    except Exception as e:
        logger.error(f"Check failed: {e}")
        stats['errors'] += 1

def start_scheduler():
    """Запустить планировщик"""
    scheduler.add_job(
        check_and_send_reminders,
        trigger=IntervalTrigger(minutes=CHECK_INTERVAL_MINUTES),
        id='check_carts',
        name='Check abandoned carts',
        replace_existing=True
    )
    scheduler.start()
    logger.info(f"⏰ Scheduler started (every {CHECK_INTERVAL_MINUTES} min)")

# FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting Abandoned Cart Bot...")
    start_scheduler()
    # Первая проверка через 30 секунд
    await asyncio.sleep(30)
    asyncio.create_task(check_and_send_reminders())
    yield
    scheduler.shutdown()
    logger.info("Abandoned Cart Bot stopped")

api = FastAPI(title="Abandoned Cart Bot", version="2.0.0", lifespan=lifespan)

@api.get("/health")
async def health():
    return {
        "status": "ok",
        "scheduler_running": scheduler.running,
        "stats": stats
    }

@api.post("/trigger")
async def trigger_check():
    """Ручной запуск проверки"""
    asyncio.create_task(check_and_send_reminders())
    return {"status": "triggered"}

@api.get("/stats")
async def get_stats():
    return stats

if __name__ == '__main__':
    uvicorn.run("abandoned_cart_bot_v2:api", host="0.0.0.0", port=PORT, reload=False)
