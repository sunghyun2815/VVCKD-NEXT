export const validateFile = (file: File, maxSize: number = 50 * 1024 * 1024): boolean => {
  if (file.size > maxSize) {
    alert(`파일 크기는 ${maxSize / 1024 / 1024}MB를 초과할 수 없습니다.`);
    return false;
  }
  return true;
};

export const processAudioFile = async (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const createAudioURL = (file: File): string => {
  return URL.createObjectURL(file);
};