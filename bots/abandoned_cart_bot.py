#!/usr/bin/env python3
"""
Telegram бот для автоматической отправки напоминаний о брошенных корзинах
Работает как отдельный сервис, который периодически проверяет брошенные корзины
и отправляет напоминания клиентам через Customer Bot
"""

import os
import logging
import requests
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import time

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Конфигурация
API_URL = os.getenv('API_URL', 'http://localhost:3000/api')
CUSTOMER_BOT_URL = os.getenv('CUSTOMER_BOT_API_URL', 'http://localhost:8001')
CHECK_INTERVAL_HOURS = int(os.getenv('ABANDONED_CART_CHECK_INTERVAL_HOURS', '1'))
REMINDER_INTERVAL_HOURS = int(os.getenv('REMINDER_INTERVAL_HOURS', '24'))
MAX_REMINDERS = int(os.getenv('MAX_REMINDERS', '3'))

# Инициализация планировщика
scheduler = BackgroundScheduler()


def get_abandoned_carts_settings():
    """Получить настройки автоматических напоминаний из API"""
    try:
        response = requests.get(
            f'{API_URL}/admin/abandoned-carts/settings',
            timeout=5
        )
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        logger.error(f'Failed to get settings: {e}')
        return None


def get_abandoned_carts():
    """Получить список брошенных корзин из API"""
    try:
        response = requests.get(
            f'{API_URL}/admin/abandoned-carts',
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            return data.get('carts', [])
        return []
    except Exception as e:
        logger.error(f'Failed to get abandoned carts: {e}')
        return []


def get_cart_details(cart_id: int):
    """Получить детали корзины из API"""
    try:
        response = requests.get(
            f'{API_URL}/admin/abandoned-carts/{cart_id}/details',
            timeout=5
        )
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        logger.error(f'Failed to get cart details: {e}')
        return None


def send_reminder_to_customer(telegram_id: str, cart_data: dict):
    """Отправить напоминание клиенту через Customer Bot"""
    try:
        items_text = cart_data.get('itemsText', '')
        total_amount = cart_data.get('totalAmount', 0)
        days_since = cart_data.get('daysSinceAbandoned', 0)
        cart_id = cart_data.get('cartId', 0)

        payload = {
            'telegramId': telegram_id,
            'cartId': cart_id,
            'items': items_text,
            'totalAmount': total_amount,
            'daysSinceAbandoned': days_since
        }

        response = requests.post(
            f'{CUSTOMER_BOT_URL}/notify/abandoned-cart',
            json=payload,
            timeout=5
        )

        if response.status_code == 200:
            logger.info(f'Reminder sent to customer {telegram_id} for cart {cart_id}')
            return True
        else:
            logger.error(f'Failed to send reminder: {response.status_code} - {response.text}')
            return False
    except Exception as e:
        logger.error(f'Error sending reminder: {e}')
        return False


def mark_reminder_sent(cart_id: int):
    """Отметить напоминание как отправленное в API"""
    try:
        response = requests.post(
            f'{API_URL}/admin/abandoned-carts/{cart_id}/mark-reminder-sent',
            timeout=5
        )
        return response.status_code == 200
    except Exception as e:
        logger.error(f'Failed to mark reminder sent: {e}')
        return False


def check_and_send_reminders():
    """Проверить брошенные корзины и отправить напоминания"""
    logger.info('Checking abandoned carts for reminders...')

    # Получаем настройки
    settings = get_abandoned_carts_settings()
    if not settings or not settings.get('autoRemindersEnabled', False):
        logger.debug('Auto reminders are disabled')
        return

    reminder_interval = settings.get('reminderIntervalHours', REMINDER_INTERVAL_HOURS)
    max_reminders = settings.get('maxReminders', MAX_REMINDERS)

    # Получаем список брошенных корзин
    carts = get_abandoned_carts()
    logger.info(f'Found {len(carts)} abandoned carts')

    sent_count = 0

    for cart in carts:
        try:
            # Пропускаем восстановленные корзины
            if cart.get('recovered', False):
                continue

            # Пропускаем корзины без telegramId
            telegram_id = cart.get('telegramId')
            if not telegram_id:
                continue

            # Проверяем, не превышен ли лимит напоминаний
            reminder_sent = cart.get('reminderSent', 0)
            if reminder_sent >= max_reminders:
                logger.debug(f'Cart {cart.get("id")} has reached max reminders ({max_reminders})')
                continue

            # Проверяем интервал между напоминаниями
            last_reminder_at = cart.get('lastReminderAt')
            if last_reminder_at:
                try:
                    last_reminder = datetime.fromisoformat(last_reminder_at.replace('Z', '+00:00'))
                    hours_since_last = (datetime.now(last_reminder.tzinfo) - last_reminder).total_seconds() / 3600
                    if hours_since_last < reminder_interval:
                        logger.debug(f'Cart {cart.get("id")} reminder interval not reached ({hours_since_last:.1f}h < {reminder_interval}h)')
                        continue
                except Exception as e:
                    logger.warning(f'Failed to parse lastReminderAt: {e}')

            # Получаем детали корзины
            cart_details = get_cart_details(cart.get('id'))
            if not cart_details:
                logger.warning(f'Failed to get details for cart {cart.get("id")}')
                continue

            # Отправляем напоминание
            if send_reminder_to_customer(telegram_id, cart_details):
                # Отмечаем как отправленное
                if mark_reminder_sent(cart.get('id')):
                    sent_count += 1
                    logger.info(f'Reminder sent successfully for cart {cart.get("id")}')
                else:
                    logger.warning(f'Reminder sent but failed to mark in API for cart {cart.get("id")}')

        except Exception as e:
            logger.error(f'Error processing cart {cart.get("id")}: {e}')

    logger.info(f'Reminders sent: {sent_count}')


def start_scheduler():
    """Запустить планировщик"""
    scheduler.add_job(
        check_and_send_reminders,
        trigger=IntervalTrigger(hours=CHECK_INTERVAL_HOURS),
        id='check_abandoned_carts',
        name='Check abandoned carts and send reminders',
        replace_existing=True
    )
    scheduler.start()
    logger.info(f'Scheduler started. Checking every {CHECK_INTERVAL_HOURS} hour(s)')


if __name__ == '__main__':
    logger.info('Starting Abandoned Cart Reminder Bot...')
    logger.info(f'API URL: {API_URL}')
    logger.info(f'Customer Bot URL: {CUSTOMER_BOT_URL}')
    logger.info(f'Check interval: {CHECK_INTERVAL_HOURS} hour(s)')

    # Запускаем планировщик
    start_scheduler()

    # Запускаем проверку сразу при старте
    check_and_send_reminders()

    # Держим процесс активным
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        logger.info('Stopping scheduler...')
        scheduler.shutdown()
        logger.info('Stopped')

