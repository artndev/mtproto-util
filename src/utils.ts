export const formatInterval = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  return `${Math.ceil(seconds / 3600)}h`;
};