/**
 * Error logging for parsing operations
 */

export enum ParseErrorLevel {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

export interface ParseErrorEntry {
    source: string;
    error: string;
    stack?: string;
    level: ParseErrorLevel;
    timestamp: Date;
    context?: Record<string, any>;
}

/**
 * Error logger for tracking parsing errors
 */
export class ParseErrorLog {
    private logs: ParseErrorEntry[] = [];
    private maxLogs: number = 1000;

    /**
     * Log a parsing error
     */
    log(entry: ParseErrorEntry): void {
        // Ensure timestamp is a Date object
        if (!(entry.timestamp instanceof Date)) {
            entry.timestamp = new Date(entry.timestamp);
        }

        this.logs.push(entry);

        // Trim old logs if exceeding max
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Also log to console based on level
        const logMessage = `[${entry.level.toUpperCase()}] ${entry.source}: ${entry.error}`;
        
        switch (entry.level) {
            case ParseErrorLevel.CRITICAL:
                console.error(logMessage);
                if (entry.stack) {
                    console.error(entry.stack);
                }
                break;
            case ParseErrorLevel.ERROR:
                console.error(logMessage);
                break;
            case ParseErrorLevel.WARNING:
                console.warn(logMessage);
                break;
            case ParseErrorLevel.INFO:
            default:
                console.info(logMessage);
                break;
        }
    }

    /**
     * Get recent error logs
     */
    getLogs(limit: number = 100): ParseErrorEntry[] {
        return this.logs.slice(-limit);
    }

    /**
     * Get logs filtered by level
     */
    getLogsByLevel(level: ParseErrorLevel, limit: number = 100): ParseErrorEntry[] {
        return this.logs
            .filter(log => log.level === level)
            .slice(-limit);
    }

    /**
     * Get logs filtered by source
     */
    getLogsBySource(source: string, limit: number = 100): ParseErrorEntry[] {
        return this.logs
            .filter(log => log.source.includes(source))
            .slice(-limit);
    }

    /**
     * Clear all logs
     */
    clear(): void {
        this.logs = [];
    }

    /**
     * Export logs to JSON
     */
    exportToJson(): string {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Get error statistics
     */
    getStatistics(): {
        total: number;
        byLevel: Record<ParseErrorLevel, number>;
        recentErrors: number;
    } {
        const byLevel: Record<ParseErrorLevel, number> = {
            [ParseErrorLevel.INFO]: 0,
            [ParseErrorLevel.WARNING]: 0,
            [ParseErrorLevel.ERROR]: 0,
            [ParseErrorLevel.CRITICAL]: 0
        };

        const oneHourAgo = Date.now() - 3600000;
        let recentErrors = 0;

        for (const log of this.logs) {
            byLevel[log.level]++;
            
            if (log.level === ParseErrorLevel.ERROR || log.level === ParseErrorLevel.CRITICAL) {
                if (log.timestamp.getTime() > oneHourAgo) {
                    recentErrors++;
                }
            }
        }

        return {
            total: this.logs.length,
            byLevel,
            recentErrors
        };
    }
}

/**
 * Create singleton instance
 */
let errorLogInstance: ParseErrorLog | null = null;

export function getParseErrorLog(): ParseErrorLog {
    if (!errorLogInstance) {
        errorLogInstance = new ParseErrorLog();
    }
    return errorLogInstance;
}
