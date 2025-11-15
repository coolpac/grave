#!/usr/bin/env python3
"""
Telegram бот для отправки уведомлений администраторам о новых заказах
"""

import os
import logging
from flask import Flask, request, jsonify
from telegram import Bot
from telegram.error import TelegramError
import asyncio
from datetime import datetime

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Инициализация Flask приложения
app = Flask(__name__)

# Получение токена бота и ID админа из переменных окружения
BOT_TOKEN = os.getenv('ADMIN_BOT_TOKEN', '')
ADMIN_CHAT_ID = os.getenv('ADMIN_CHAT_ID', '')

if not BOT_TOKEN:
    logger.warning('ADMIN_BOT_TOKEN not set. Bot will not work.')
if not ADMIN_CHAT_ID:
    logger.warning('ADMIN_CHAT_ID not set. Bot will not work.')

bot = Bot(token=BOT_TOKEN) if BOT_TOKEN else None


async def send_message(chat_id: str, text: str) -> bool:
    """Отправка сообщения администратору"""
    if not bot:
        logger.error('Bot not initialized')
        return False
    
    try:
        await bot.send_message(
            chat_id=chat_id,
            text=text,
            parse_mode='HTML'
        )
        return True
    except TelegramError as e:
        logger.error(f'Failed to send message: {e}')
        return False


@app.route('/health', methods=['GET'])
def health():
    """Проверка здоровья сервиса"""
    return jsonify({
        'status': 'ok',
        'bot_initialized': bot is not None,
        'admin_chat_id_set': bool(ADMIN_CHAT_ID)
    })


@app.route('/notify/admin', methods=['POST'])
def notify_admin():
    """Отправка уведомления администратору о новом заказе"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        order_number = data.get('orderNumber')
        order_id = data.get('orderId')
        customer_name = data.get('customerName', '')
        customer_phone = data.get('customerPhone', '')
        customer_email = data.get('customerEmail', '')
        customer_address = data.get('customerAddress', '')
        comment = data.get('comment', '')
        items = data.get('items', '')
        total = data.get('total', 0)
        created_at = data.get('createdAt', '')
        
        if not order_number:
            return jsonify({'error': 'Missing orderNumber'}), 400
        
        if not ADMIN_CHAT_ID:
            logger.warning('ADMIN_CHAT_ID not set, skipping notification')
            return jsonify({'status': 'skipped', 'message': 'ADMIN_CHAT_ID not configured'})
        
        # Форматирование даты
        try:
            if created_at:
                dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                formatted_date = dt.strftime('%d.%m.%Y %H:%M')
            else:
                formatted_date = datetime.now().strftime('%d.%m.%Y %H:%M')
        except:
            formatted_date = datetime.now().strftime('%d.%m.%Y %H:%M')
        
        # Формирование сообщения для админа
        message = f"""
🆕 <b>НОВЫЙ ЗАКАЗ</b>

📦 <b>Номер заказа:</b> #{order_number}
🆔 <b>ID заказа:</b> {order_id}

👤 <b>Клиент:</b>
   Имя: {customer_name}
   Телефон: {customer_phone}
   {f'Email: {customer_email}' if customer_email else ''}
   {f'Адрес: {customer_address}' if customer_address else ''}
   {f'Комментарий: {comment}' if comment else ''}

📦 <b>Товары:</b>
{items}

💰 <b>Сумма:</b> {total:,.0f} ₽
📅 <b>Дата:</b> {formatted_date}

⚠️ Требуется обработка заказа!
        """.strip()
        
        # Отправка сообщения
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(send_message(ADMIN_CHAT_ID, message))
        loop.close()
        
        if success:
            logger.info(f'Admin notification sent for order {order_number}')
            return jsonify({'status': 'success', 'message': 'Notification sent'})
        else:
            return jsonify({'error': 'Failed to send notification'}), 500
            
    except Exception as e:
        logger.error(f'Error processing admin notification: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/notify/status', methods=['POST'])
def notify_status_update():
    """Отправка уведомления об изменении статуса заказа"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        order_number = data.get('orderNumber')
        status = data.get('status', '')
        
        if not order_number or not status:
            return jsonify({'error': 'Missing required fields'}), 400
        
        if not ADMIN_CHAT_ID:
            return jsonify({'status': 'skipped'})
        
        message = f"""
📦 <b>Обновление статуса заказа</b>

Номер заказа: <b>#{order_number}</b>
Статус: <b>{status}</b>
        """.strip()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(send_message(ADMIN_CHAT_ID, message))
        loop.close()
        
        if success:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'error': 'Failed to send notification'}), 500
            
    except Exception as e:
        logger.error(f'Error processing status notification: {e}')
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 8002))
    logger.info(f'Starting admin bot API on port {port}')
    app.run(host='0.0.0.0', port=port, debug=False)

