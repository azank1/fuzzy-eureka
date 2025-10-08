/**
 * ContextManager.ts
 * 
 * Purpose: Execution context and variable management
 */

export class ContextManager {
  private context: Map<string, any>;

  constructor() {
    this.context = new Map();
  }

  set(key: string, value: any): void {
    this.context.set(key, value);
  }

  get(key: string): any {
    return this.context.get(key);
  }

  has(key: string): boolean {
    return this.context.has(key);
  }

  resolveTemplate(template: string | object): any {
    if (typeof template === 'string') {
      // Replace {{variable}} patterns
      return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const value = this.get(key.trim());
        return value !== undefined ? String(value) : match;
      });
    }

    if (typeof template === 'object' && template !== null) {
      // Recursively resolve objects
      const resolved: any = Array.isArray(template) ? [] : {};
      for (const [key, value] of Object.entries(template)) {
        resolved[key] = this.resolveTemplate(value);
      }
      return resolved;
    }

    return template;
  }

  dump(): Record<string, any> {
    const result: Record<string, any> = {};
    this.context.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  clear(): void {
    this.context.clear();
  }
}
