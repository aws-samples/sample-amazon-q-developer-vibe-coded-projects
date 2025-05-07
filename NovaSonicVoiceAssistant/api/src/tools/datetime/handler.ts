import { DateTimeParams, DateTimeResult } from './types';
import { ToolHandler } from '../types';
import { SessionContext } from '../../types/novasonic.types';

/**
 * Handler for the DateTime tool
 * 
 * @param params - Parameters for the date time tool
 * @param context - Session context with user information
 * @returns The date time information
 */
export const handleDateTimeTool: ToolHandler<DateTimeParams, DateTimeResult> = (params, context?: SessionContext) => {
  // Handle case where params is undefined or null
  const { format = 'long', timezone = 'UTC' } = params || {};
  
  // Log user information if available
  if (context?.user) {
    console.log(`DateTime tool executed for user: ${context.user.username}`, { userId: context.user.userId });
    
    if (context.sessionId) {
      console.log(`Tool executed in session: ${context.sessionId}`);
    }
  } else {
    console.log('DateTime tool executed without user context');
  }
  
  // Get current date in the specified timezone
  const now = new Date();
  
  // Format options based on the requested format
  let dateOptions: Intl.DateTimeFormatOptions = {};
  let timeOptions: Intl.DateTimeFormatOptions = {};
  
  switch (format.toLowerCase()) {
    case 'short':
      dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
      timeOptions = { hour: 'numeric', minute: 'numeric' };
      break;
    case 'iso':
      // ISO format will be handled separately
      break;
    case 'long':
    default:
      dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      timeOptions = { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true };
      break;
  }
  
  // Get formatted date and time
  let formattedDate: string;
  let formattedTime: string;
  let formattedDay: string;
  let formattedFull: string;
  
  try {
    if (format.toLowerCase() === 'iso') {
      formattedDate = now.toISOString().split('T')[0];
      formattedTime = now.toISOString().split('T')[1].split('.')[0];
      formattedDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
      formattedFull = now.toISOString();
    } else {
      formattedDate = new Intl.DateTimeFormat('en-US', { ...dateOptions, timeZone: timezone }).format(now);
      formattedTime = new Intl.DateTimeFormat('en-US', { ...timeOptions, timeZone: timezone }).format(now);
      formattedDay = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: timezone }).format(now);
      formattedFull = new Intl.DateTimeFormat('en-US', { 
        ...dateOptions, 
        ...timeOptions, 
        timeZone: timezone,
        weekday: 'long'
      }).format(now);
    }
  } catch (error) {
    // If timezone is invalid, fall back to UTC
    console.warn(`Invalid timezone: ${timezone}, falling back to UTC`);
    formattedDate = new Intl.DateTimeFormat('en-US', dateOptions).format(now);
    formattedTime = new Intl.DateTimeFormat('en-US', timeOptions).format(now);
    formattedDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
    formattedFull = new Intl.DateTimeFormat('en-US', { 
      ...dateOptions, 
      ...timeOptions, 
      weekday: 'long'
    }).format(now);
  }
  
  return {
    date: formattedDate,
    time: formattedTime,
    day: formattedDay,
    timestamp: now.getTime(),
    timezone: timezone,
    formatted: formattedFull,
    // Include user information if available
    userInfo: context?.user ? {
      userId: context.user.userId,
      username: context.user.username,
      greeting: `Hello ${context.user.username}!`
    } : undefined
  };
};
