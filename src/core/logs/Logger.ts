/**
 * Logger.ts
 * 
 * Purpose: Simple logging utility with file output
 */

import * as fs from 'fs';
import * as path from 'path';

export class Logger {
  private static logDir = path.join(process.cwd(), 'data', 'logs');
  private static currentLogFile: string;

  static {
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // Create daily log file
    const date = new Date().toISOString().split('T')[0];
    this.currentLogFile = path.join(this.logDir, `${date}.json`);
    
    if (!fs.existsSync(this.currentLogFile)) {
      fs.writeFileSync(this.currentLogFile, JSON.stringify({ logs: [] }, null, 2));
    }
  }

  private static log(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    // Console output
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    console.log(`${prefix} ${message}`, data || '');

    // File output
    try {
      const content = fs.readFileSync(this.currentLogFile, 'utf-8');
      const logData = JSON.parse(content);
      logData.logs.push(logEntry);
      fs.writeFileSync(this.currentLogFile, JSON.stringify(logData, null, 2));
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  static info(message: string, data?: any) {
    this.log('info', message, data);
  }

  static warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  static error(message: string, data?: any) {
    this.log('error', message, data);
  }

  static debug(message: string, data?: any) {
    this.log('debug', message, data);
  }
}
