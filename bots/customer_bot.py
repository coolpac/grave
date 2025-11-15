#!/usr/bin/env python3
"""
Telegram бот для отправки уведомлений клиентам о статусе заказов
"""

import os
import logging
from flask import Flask, request, jsonify
from telegram import Bot
from telegram.error import TelegramError
import asyncio
from typing import Optional

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Инициализация Flask приложения
app = Flask(__name__)

# Получение токена бота из переменных окружения
BOT_TOKEN = os.getenv('CUSTOMER_BOT_TOKEN', '')
if not BOT_TOKEN:
    logger.warning('CUSTOMER_BOT_TOKEN not set. Bot will not work.')

bot = Bot(token=BOT_TOKEN) if BOT_TOKEN else None


async def send_message(chat_id: str, text: str) -> bool:
    """Отправка сообщения пользователю"""
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
    return jsonify({'status': 'ok', 'bot_initialized': bot is not None})


@app.route('/notify/customer', methods=['POST'])
def notify_customer():
    """Отправка уведомления клиенту о новом заказе"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        telegram_id = data.get('telegramId')
        order_number = data.get('orderNumber')
        order_id = data.get('orderId')
        customer_name = data.get('customerName', '')
        total = data.get('total', 0)
        
        if not telegram_id or not order_number:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Формирование сообщения
        message = f"""
✅ <b>Заказ принят в обработку!</b>

📦 Номер заказа: <b>#{order_number}</b>

👋 Здравствуйте, {customer_name}!

Ваш заказ успешно оформлен и принят в обработку.

💰 Сумма заказа: <b>{total:,.0f} ₽</b>

Мы свяжемся с вами в ближайшее время для подтверждения заказа и уточнения деталей доставки.

Спасибо за ваш заказ! 🙏
        """.strip()
        
        # Отправка сообщения
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(send_message(telegram_id, message))
        loop.close()
        
        if success:
            logger.info(f'Notification sent to customer {telegram_id} for order {order_number}')
            return jsonify({'status': 'success', 'message': 'Notification sent'})
        else:
            return jsonify({'error': 'Failed to send notification'}), 500
            
    except Exception as e:
        logger.error(f'Error processing notification: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/notify/status', methods=['POST'])
def notify_status():
    """Отправка уведомления об изменении статуса заказа"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        telegram_id = data.get('telegramId')
        order_number = data.get('orderNumber')
        status = data.get('status', '')
        
        if not telegram_id or not order_number:
            return jsonify({'error': 'Missing required fields'}), 400
        
        status_messages = {
            'CONFIRMED': '✅ Заказ подтвержден',
            'PROCESSING': '🔄 Заказ в обработке',
            'SHIPPED': '🚚 Заказ отправлен',
            'DELIVERED': '🎉 Заказ доставлен',
            'CANCELLED': '❌ Заказ отменен',
        }
        
        status_text = status_messages.get(status, f'Статус: {status}')
        
        message = f"""
📦 <b>Обновление статуса заказа</b>

Номер заказа: <b>#{order_number}</b>

{status_text}

Мы продолжаем обрабатывать ваш заказ. Спасибо за терпение!
        """.strip()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(send_message(telegram_id, message))
        loop.close()
        
        if success:
            logger.info(f'Status notification sent to customer {telegram_id} for order {order_number}')
            return jsonify({'status': 'success'})
        else:
            return jsonify({'error': 'Failed to send notification'}), 500
            
    except Exception as e:
        logger.error(f'Error processing status notification: {e}')
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 8001))
    logger.info(f'Starting customer bot API on port {port}')
    app.run(host='0.0.0.0', port=port, debug=False)

