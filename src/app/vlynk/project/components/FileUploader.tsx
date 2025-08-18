// src/app/vlynk/project/components/FileUploader.tsx
'use client';

import React, { useState, useRef, useCallback } from 'react';
import styles from '../fileuploader.module.css';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  onClose: () => void;
  acceptedFormats: string[];
  maxFileSize: number; // bytes
}

export default function FileUploader({
  onFileUpload,
  onClose,
  acceptedFormats,
  maxFileSize
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 검증
  const validateFile = (file: File): string | null => {
    // 크기 검사
    if (file.size > maxFileSize) {
      return `File size exceeds ${(maxFileSize / 1024 / 1024).toFixed(1)}MB limit`;
    }

    // 확장자 검사
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(fileExtension)) {
      return `File type not supported. Accepted formats: ${acceptedFormats.join(', ')}`;
    }

    // MIME 타입 검사
    if (!file.type.startsWith('audio/')) {
      return 'Only audio files are allowed';
    }

    return null;
  };

  // 파일 선택 처리
  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
  }, [maxFileSize, acceptedFormats]);

  // 드래그 앤 드롭 이벤트
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // 파일 입력 변경
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // 업로드 실행
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      // 실제 업로드 처리
      await new Promise(resolve => setTimeout(resolve, 2000)); // 시뮬레이션

      setUploadProgress(100);
      
      setTimeout(() => {
        onFileUpload(selectedFile);
        onClose();
      }, 500);

    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 파일 지속 시간 추정 (시뮬레이션)
  const estimateDuration = (file: File): string => {
    // 실제로는 오디오 파일을 분석해야 함
    const estimatedSeconds = Math.floor(file.size / 64000); // 대략적인 추정
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = estimatedSeconds % 60;
    return `~${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.uploaderOverlay}>
      <div className={styles.uploaderModal}>
        {/* 헤더 */}
        <div className={styles.uploaderHeader}>
          <div className={styles.uploaderTitle}>
            AUDIO FILE UPLOAD
          </div>
          <button
            onClick={onClose}
            className={styles.closeBtn}
            disabled={isUploading}
          >
            ✕
          </button>
        </div>

        {/* 메인 콘텐츠 */}
        <div className={styles.uploaderContent}>
          {!selectedFile ? (
            /* 파일 선택 영역 */
            <div
              className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={styles.dropZoneIcon}>
                📁
              </div>
              <div className={styles.dropZoneText}>
                <div className={styles.dropZoneTitle}>
                  Drag & drop your audio file here
                </div>
                <div className={styles.dropZoneSubtitle}>
                  or click to browse
                </div>
              </div>
              
              <div className={styles.fileRequirements}>
                <div className={styles.requirementItem}>
                  <strong>Formats:</strong> {acceptedFormats.join(', ')}
                </div>
                <div className={styles.requirementItem}>
                  <strong>Max size:</strong> {(maxFileSize / 1024 / 1024).toFixed(1)}MB
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedFormats.join(',')}
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            /* 파일 정보 & 업로드 */
            <div className={styles.filePreview}>
              <div className={styles.fileIcon}>
                🎵
              </div>
              
              <div className={styles.fileInfo}>
                <div className={styles.fileName}>
                  {selectedFile.name}
                </div>
                
                <div className={styles.fileDetails}>
                  <div className={styles.fileDetail}>
                    <span>Size:</span>
                    <span>{formatFileSize(selectedFile.size)}</span>
                  </div>
                  <div className={styles.fileDetail}>
                    <span>Type:</span>
                    <span>{selectedFile.type}</span>
                  </div>
                  <div className={styles.fileDetail}>
                    <span>Duration:</span>
                    <span>{estimateDuration(selectedFile)}</span>
                  </div>
                </div>
              </div>

              {/* 업로드 진행률 */}
              {isUploading && (
                <div className={styles.uploadProgress}>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className={styles.progressText}>
                    {Math.round(uploadProgress)}% uploaded
                  </div>
                </div>
              )}

              {/* 버튼 영역 */}
              <div className={styles.uploadActions}>
                <button
                  onClick={() => setSelectedFile(null)}
                  className={styles.cancelBtn}
                  disabled={isUploading}
                >
                  CHANGE FILE
                </button>
                
                <button
                  onClick={handleUpload}
                  className={styles.uploadBtn}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <div className={styles.uploadSpinner}></div>
                      UPLOADING...
                    </>
                  ) : (
                    'UPLOAD FILE'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              <span className={styles.errorText}>{error}</span>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className={styles.uploaderFooter}>
          <div className={styles.uploadTips}>
            <div className={styles.tipTitle}>UPLOAD TIPS:</div>
            <div className={styles.tipList}>
              • Higher quality files provide better waveform visualization
              • Files will be automatically processed for streaming
              • Your upload will be synchronized with all room participants
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}