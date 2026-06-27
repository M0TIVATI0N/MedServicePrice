import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Agent, fetch } from 'undici';
import * as cheerio from 'cheerio';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import xlsx from 'xlsx';
import { RawClinicRecord } from '../models';
import { ParseErrorLog, ParseErrorLevel } from './errorLogger';

/**
 * Configuration for data collector
 */
export interface DataCollectorConfig {
    rawStoragePath: string;
    maxConcurrentDownloads: number;
    timeoutMs: number;
    retryAttempts: number;
}

/**
 * Supported document types
 */
export type DocumentType = 'html' | 'pdf' | 'docx' | 'excel' | 'json';

/**
 * Result of document parsing
 */
export interface ParsedDocumentResult {
    documentType: DocumentType;
    sourceUrl: string;
    content: string;
    metadata: Record<string, any>;
    parsedAt: Date;
}

/**
 * Extracted service from document
 */
export interface ExtractedService {
    serviceName: string;
    price: number;
    currency: string;
    category?: string;
    additionalInfo?: Record<string, any>;
}

/**
 * Clinic information extracted from document
 */
export interface ExtractedClinicInfo {
    clinicId: string;
    clinicName: string;
    city: string;
    address: string;
    phone: string;
    workingHours: string;
    location?: { lat: number; lng: number };
}

/**
 * Data collector class for multi-format document parsing
 */
export class DataCollector {
    private config: DataCollectorConfig;
    private dispatcher: Agent;
    private errorLogger: ParseErrorLog;

    constructor(config?: Partial<DataCollectorConfig>) {
        this.config = {
            rawStoragePath: config?.rawStoragePath ?? './data/raw',
            maxConcurrentDownloads: config?.maxConcurrentDownloads ?? 10,
            timeoutMs: config?.timeoutMs ?? 30000,
            retryAttempts: config?.retryAttempts ?? 3
        };

        this.dispatcher = new Agent({
            connections: this.config.maxConcurrentDownloads,
            pipelining: 4,
            keepAliveTimeout: 60000,
            keepAliveMaxTimeout: 60000
        });

        this.errorLogger = new ParseErrorLog();

        // Ensure raw storage directory exists
        if (!fs.existsSync(this.config.rawStoragePath)) {
            fs.mkdirSync(this.config.rawStoragePath, { recursive: true });
        }
    }

    /**
     * Generate unique hash for deduplication
     */
    private generateHash(
        clinicId: string,
        sourceUrl: string,
        serviceName: string,
        price: number
    ): string {
        const data = `${clinicId}|${sourceUrl}|${serviceName}|${price}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Download file from URL
     */
    async downloadFile(url: string): Promise<Buffer> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

                const response = await fetch(url, {
                    dispatcher: this.dispatcher,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; MedServicePriceBot/1.0)',
                        'Accept': '*/*'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return Buffer.from(await response.arrayBuffer());
            } catch (error: any) {
                lastError = error;
                if (attempt < this.config.retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }

        throw lastError || new Error('Failed to download file');
    }

    /**
     * Detect document type from URL or content
     */
    detectDocumentType(url: string, contentType?: string): DocumentType {
        if (contentType) {
            if (contentType.includes('html')) return 'html';
            if (contentType.includes('pdf')) return 'pdf';
            if (contentType.includes('wordprocessingml') || contentType.includes('msword')) return 'docx';
            if (contentType.includes('spreadsheetml') || contentType.includes('excel')) return 'excel';
            if (contentType.includes('json')) return 'json';
        }

        const urlLower = url.toLowerCase();
        if (urlLower.endsWith('.pdf')) return 'pdf';
        if (urlLower.endsWith('.docx') || urlLower.endsWith('.doc')) return 'docx';
        if (urlLower.endsWith('.xlsx') || urlLower.endsWith('.xls')) return 'excel';
        if (urlLower.endsWith('.json')) return 'json';
        if (urlLower.endsWith('.html') || urlLower.endsWith('.htm')) return 'html';

        // Default to HTML for web pages
        return 'html';
    }

    /**
     * Parse HTML page
     */
    async parseHtml(buffer: Buffer, url: string): Promise<ParsedDocumentResult> {
        const html = buffer.toString('utf-8');
        const $ = cheerio.load(html);

        // Extract metadata
        const metadata: Record<string, any> = {
            title: $('title').text().trim(),
            description: $('meta[name="description"]').attr('content') || '',
            keywords: $('meta[name="keywords"]').attr('content') || ''
        };

        // Get visible text content
        const content = $('body').text().replace(/\s+/g, ' ').trim();

        return {
            documentType: 'html',
            sourceUrl: url,
            content,
            metadata,
            parsedAt: new Date()
        };
    }

    /**
     * Parse PDF document
     */
    async parsePdf(buffer: Buffer, url: string): Promise<ParsedDocumentResult> {
        const data = await pdfParse(buffer);
        
        return {
            documentType: 'pdf',
            sourceUrl: url,
            content: data.text,
            metadata: {
                info: data.info,
                version: data.version,
                numpages: data.numpages
            },
            parsedAt: new Date()
        };
    }

    /**
     * Parse DOCX document
     */
    async parseDocx(buffer: Buffer, url: string): Promise<ParsedDocumentResult> {
        const result = await mammoth.extractRawText({ buffer });
        
        return {
            documentType: 'docx',
            sourceUrl: url,
            content: result.value,
            metadata: {
                messages: result.messages
            },
            parsedAt: new Date()
        };
    }

    /**
     * Parse Excel document
     */
    async parseExcel(buffer: Buffer, url: string): Promise<ParsedDocumentResult> {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        
        const sheets: Record<string, any[]> = {};
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            sheets[sheetName] = xlsx.utils.sheet_to_json(worksheet);
        });

        return {
            documentType: 'excel',
            sourceUrl: url,
            content: JSON.stringify(sheets),
            metadata: {
                sheetNames: workbook.SheetNames,
                sheetCount: workbook.SheetNames.length
            },
            parsedAt: new Date()
        };
    }

    /**
     * Parse document from URL (auto-detect format)
     */
    async parseDocumentFromUrl(url: string): Promise<ParsedDocumentResult> {
        const startTime = Date.now();
        
        try {
            const buffer = await this.downloadFile(url);
            const documentType = this.detectDocumentType(url);

            let result: ParsedDocumentResult;

            switch (documentType) {
                case 'pdf':
                    result = await this.parsePdf(buffer, url);
                    break;
                case 'docx':
                    result = await this.parseDocx(buffer, url);
                    break;
                case 'excel':
                    result = await this.parseExcel(buffer, url);
                    break;
                case 'html':
                default:
                    result = await this.parseHtml(buffer, url);
                    break;
            }

            // Store raw data
            await this.storeRawData(result);

            const duration = Date.now() - startTime;
            console.log(`Parsed ${documentType} from ${url} in ${duration}ms`);

            return result;
        } catch (error: any) {
            this.errorLogger.log({
                source: url,
                error: error.message,
                stack: error.stack,
                level: ParseErrorLevel.CRITICAL,
                timestamp: new Date(),
                context: { operation: 'parseDocumentFromUrl' }
            });
            throw error;
        }
    }

    /**
     * Store raw parsed data
     */
    async storeRawData(result: ParsedDocumentResult): Promise<void> {
        const safeFilename = result.sourceUrl.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
        const timestamp = result.parsedAt.toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}_${safeFilename}.json`;
        const filepath = path.join(this.config.rawStoragePath, filename);

        const rawData = {
            ...result,
            storedAt: new Date().toISOString()
        };

        fs.writeFileSync(filepath, JSON.stringify(rawData, null, 2));
    }

    /**
     * Extract services from text content
     */
    extractServicesFromText(text: string): ExtractedService[] {
        const results: ExtractedService[] = [];
        const lines = text.split(/\r?\n/);

        // Multiple patterns to match different price formats
        const patterns = [
            /(.+?)\s+(\d+[,\s\d]*)\s*(тг|тенге|₸|KZT|тенге|руб|rub|₽)$/i,
            /(\d+[,\s\d]*)\s*(тг|тенге|₸|KZT|тенге|руб|rub|₽)\s*-?\s*(.+)/i,
            /(.+?):?\s*(\d{3,}(?:[\s,]\d{3})*)\s*(тг|тенге|₸)?$/i
        ];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            for (const pattern of patterns) {
                const match = trimmedLine.match(pattern);
                if (match) {
                    let title: string;
                    let priceStr: string;

                    if (match[3] && !isNaN(Number(match[1]))) {
                        // Pattern 2: price first
                        priceStr = match[1];
                        title = match[3];
                    } else {
                        // Pattern 1 & 3: title first
                        title = match[1].trim();
                        priceStr = match[2];
                    }

                    const price = Number(priceStr.replace(/[\s,]/g, ''));
                    
                    if (title && price > 0 && title.length < 500) {
                        results.push({
                            serviceName: title,
                            price,
                            currency: 'KZT',
                            category: this.inferCategory(title)
                        });
                        break;
                    }
                }
            }
        }

        return results;
    }

    /**
     * Infer service category from name
     */
    private inferCategory(serviceName: string): string {
        const name = serviceName.toLowerCase();
        
        if (name.includes('анализ') || name.includes('крови') || name.includes('мочи') || name.includes('пцр')) {
            return 'лаборатория';
        }
        if (name.includes('узи') || name.includes('мрт') || name.includes('рентген') || name.includes('экг')) {
            return 'диагностика';
        }
        if (name.includes('приём') || name.includes('консультация') || name.includes('осмотр')) {
            return 'приём врача';
        }
        if (name.includes('вакцина') || name.includes('прививка') || name.includes('процедур')) {
            return 'процедура';
        }
        
        return 'прочее';
    }

    /**
     * Convert extracted data to RawClinicRecord format
     */
    convertToRecords(
        clinicInfo: ExtractedClinicInfo,
        services: ExtractedService[],
        sourceUrl: string,
        parsedAt: Date
    ): RawClinicRecord[] {
        return services.map(service => ({
            clinic_id: clinicInfo.clinicId,
            clinic_name: clinicInfo.clinicName,
            city: clinicInfo.city,
            address: clinicInfo.address,
            phone: clinicInfo.phone,
            working_hours: clinicInfo.workingHours,
            source_url: sourceUrl,
            service_name_raw: service.serviceName,
            category: service.category as any ?? 'прочее',
            price_kzt: service.price,
            currency: service.currency as any,
            duration_days: 0,
            parsed_at: parsedAt,
            is_active: true,
            location: clinicInfo.location,
            raw_hash: this.generateHash(
                clinicInfo.clinicId,
                sourceUrl,
                service.serviceName,
                service.price
            )
        }));
    }

    /**
     * Parse HTML page with structured extraction
     */
    async parseHtmlPage(
        url: string,
        clinicInfo: ExtractedClinicInfo
    ): Promise<RawClinicRecord[]> {
        try {
            const result = await this.parseDocumentFromUrl(url);
            const services = this.extractServicesFromText(result.content);
            
            return this.convertToRecords(
                clinicInfo,
                services,
                url,
                result.parsedAt
            );
        } catch (error: any) {
            this.errorLogger.log({
                source: url,
                error: error.message,
                level: ParseErrorLevel.ERROR,
                timestamp: new Date(),
                context: { clinicId: clinicInfo.clinicId }
            });
            return [];
        }
    }

    /**
     * Batch parse multiple documents
     */
    async parseDocuments(
        documents: Array<{ url: string; clinicInfo: ExtractedClinicInfo }>
    ): Promise<RawClinicRecord[]> {
        const allRecords: RawClinicRecord[] = [];
        const errors: Array<{ url: string; error: string }> = [];

        for (const doc of documents) {
            try {
                const records = await this.parseHtmlPage(doc.url, doc.clinicInfo);
                allRecords.push(...records);
            } catch (error: any) {
                errors.push({ url: doc.url, error: error.message });
            }
        }

        // Log batch errors
        if (errors.length > 0) {
            this.errorLogger.log({
                source: 'batch_parse',
                error: `Failed to parse ${errors.length} documents`,
                level: ParseErrorLevel.WARNING,
                timestamp: new Date(),
                context: { errors }
            });
        }

        return allRecords;
    }

    /**
     * Get error logs
     */
    getErrorLogs(limit: number = 100): ParseErrorLog['logs'] {
        return this.errorLogger.getLogs(limit);
    }

    /**
     * Clear error logs
     */
    clearErrorLogs(): void {
        this.errorLogger.clear();
    }
}

/**
 * Create singleton instance
 */
let dataCollectorInstance: DataCollector | null = null;

export function getDataCollector(config?: Partial<DataCollectorConfig>): DataCollector {
    if (!dataCollectorInstance) {
        dataCollectorInstance = new DataCollector(config);
    }
    return dataCollectorInstance;
}
