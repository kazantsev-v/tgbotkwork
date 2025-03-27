const axios = require('axios');
const logger = require('./logger');
const { config } = require('../config/config');

/**
 * Класс для мониторинга здоровья компонентов системы
 */
class HealthMonitor {
    constructor(options = {}) {
        // Настройки по умолчанию
        this.options = {
            interval: options.interval || 60000, // Интервал проверки в мс (по умолчанию 1 минута)
            backendUrl: options.backendUrl || config.backendURL,
            onError: options.onError || (() => {}),
            maxFailures: options.maxFailures || 3, // Максимальное количество ошибок подряд
        };
        
        this.components = {
            backend: { status: 'unknown', failures: 0, lastCheck: null },
            bot: { status: 'healthy', failures: 0, lastCheck: new Date() },
            database: { status: 'unknown', failures: 0, lastCheck: null },
        };
        
        this.intervalId = null;
    }
    
    /**
     * Запустить мониторинг
     */
    start() {
        if (this.intervalId) {
            logger.warn('Health monitor is already running');
            return;
        }
        
        logger.info('Starting health monitor', { 
            interval: this.options.interval,
            components: Object.keys(this.components)
        });
        
        // Выполняем первую проверку сразу
        this.checkHealth();
        
        // Настраиваем периодические проверки
        this.intervalId = setInterval(() => this.checkHealth(), this.options.interval);
    }
    
    /**
     * Остановить мониторинг
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger.info('Health monitor stopped');
        }
    }
    
    /**
     * Проверить статус бэкенда
     */
    async checkBackend() {
        try {
            const healthEndpoint = `${this.options.backendUrl}/health`;
            logger.debug('Checking backend health', { url: healthEndpoint });
            
            const response = await axios.get(healthEndpoint, { 
                timeout: 5000, // 5 секунд таймаут
                validateStatus: null // Принимаем любой статус-код для анализа
            });
            
            const isHealthy = response.status >= 200 && response.status < 300;
            
            if (isHealthy) {
                this.updateComponentStatus('backend', 'healthy');
            } else {
                throw new Error(`Unhealthy status code: ${response.status}`);
            }
            
            return isHealthy;
        } catch (error) {
            this.updateComponentStatus('backend', 'unhealthy', error);
            return false;
        }
    }
    
    /**
     * Выполнить проверку базы данных через бэкенд
     */
    async checkDatabase() {
        try {
            const dbCheckEndpoint = `${this.options.backendUrl}/health/db`;
            logger.debug('Checking database health', { url: dbCheckEndpoint });
            
            const response = await axios.get(dbCheckEndpoint, { 
                timeout: 5000,
                validateStatus: null
            });
            
            const isHealthy = response.status === 200 && response.data?.status === 'ok';
            
            if (isHealthy) {
                this.updateComponentStatus('database', 'healthy');
            } else {
                throw new Error(`Unhealthy database: ${JSON.stringify(response.data)}`);
            }
            
            return isHealthy;
        } catch (error) {
            this.updateComponentStatus('database', 'unhealthy', error);
            return false;
        }
    }
    
    /**
     * Обновить статус компонента
     */
    updateComponentStatus(component, status, error = null) {
        const prevStatus = this.components[component].status;
        const now = new Date();
        
        // Обновляем статус компонента
        this.components[component].lastCheck = now;
        this.components[component].status = status;
        
        if (status === 'healthy') {
            // Сбрасываем счетчик ошибок, если компонент здоров
            if (this.components[component].failures > 0) {
                logger.info(`Component ${component} recovered`, {
                    previousFailures: this.components[component].failures
                });
            }
            this.components[component].failures = 0;
        } else {
            // Увеличиваем счетчик ошибок
            this.components[component].failures++;
            
            const errorMessage = error ? error.message : 'Unknown error';
            logger.error(`Component ${component} is unhealthy (failure #${this.components[component].failures})`, {
                error: errorMessage,
                stack: error?.stack
            });
            
            // Вызываем обработчик ошибок, если достигнут порог
            if (this.components[component].failures >= this.options.maxFailures) {
                this.options.onError(component, this.components[component].failures, errorMessage);
            }
        }
        
        // Логируем изменение статуса
        if (prevStatus !== status) {
            if (status === 'healthy') {
                logger.info(`Component ${component} is now healthy`);
            } else {
                logger.warn(`Component ${component} is now ${status}`);
            }
        }
    }
    
    /**
     * Проверить здоровье всех компонентов
     */
    async checkHealth() {
        logger.debug('Running health check');
        
        try {
            // Отмечаем бота как здоровый, так как проверка выполняется
            this.updateComponentStatus('bot', 'healthy');
            
            // Проверяем бэкенд
            await this.checkBackend();
            
            // Если бэкенд здоров, проверяем базу данных
            if (this.components.backend.status === 'healthy') {
                await this.checkDatabase();
            }
            
            // Логируем общий статус здоровья
            logger.debug('Health check completed', { 
                components: this.getStatuses() 
            });
        } catch (error) {
            logger.error('Error during health check', { error });
        }
    }
    
    /**
     * Получить текущие статусы всех компонентов
     */
    getStatuses() {
        return Object.fromEntries(
            Object.entries(this.components).map(([name, info]) => [
                name, 
                { 
                    status: info.status, 
                    failures: info.failures,
                    lastCheck: info.lastCheck
                }
            ])
        );
    }
    
    /**
     * Проверить, здорова ли система в целом
     */
    isSystemHealthy() {
        return Object.values(this.components).every(
            component => component.status === 'healthy'
        );
    }
}

module.exports = HealthMonitor;
