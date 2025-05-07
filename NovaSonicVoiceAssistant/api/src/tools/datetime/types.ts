/**
 * DateTime tool specific types
 */

export interface DateTimeParams {
  format?: string;  // Optional format parameter (e.g., 'iso', 'short', 'long')
  timezone?: string; // Optional timezone parameter (e.g., 'UTC', 'America/New_York')
}

export interface DateTimeResult {
  date: string;      // Formatted date
  time: string;      // Formatted time
  day: string;       // Day of the week
  timestamp: number; // Unix timestamp
  timezone: string;  // Timezone used
  formatted: string; // Full formatted date and time
  userInfo?: {       // Optional user information from context
    userId: string;
    username: string;
    greeting: string;
  };
}
