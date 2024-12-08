'use client';

import { useState } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import UploadModal from './UploadModal';

export default function UploadButton() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [showModal, setShowModal] = useState(false);

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Only accept images
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
        setShowModal(true);
        setIsUploading(true);
        setUploadProgress(0);
        setUploadStatus('Processing image...');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/images/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Upload successful:', result);

            // Update status
            setUploadStatus('Upload complete!');
            setUploadProgress(100);

            // Close modal after a delay
            setTimeout(() => {
                setShowModal(false);
                setIsUploading(false);
                setUploadProgress(0);
                setUploadStatus('');
                setImagePreview('');
            }, 1500);

            // Clear the file input
            event.target.value = '';
        } catch (error) {
            console.error('Upload error:', error);
            setUploadStatus('Upload failed. Please try again.');
            setTimeout(() => {
                setShowModal(false);
                setIsUploading(false);
                setUploadProgress(0);
                setUploadStatus('');
                setImagePreview('');
            }, 3000);
        }
    };

    return (
        <>
            <div className="relative">
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                />
                <label
                    htmlFor="file-upload"
                    className={`
                        flex items-center space-x-2 px-4 py-2 rounded-lg
                        ${isUploading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-primary hover:bg-primary-hover cursor-pointer'
                        }
                        text-white transition-colors
                    `}
                >
                    <CloudArrowUpIcon className="h-5 w-5" />
                    <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
                </label>
            </div>

            <UploadModal
                isOpen={showModal}
                onClose={() => {
                    if (!isUploading) {
                        setShowModal(false);
                        setImagePreview('');
                        setUploadStatus('');
                        setUploadProgress(0);
                    }
                }}
                imagePreview={imagePreview}
                uploadStatus={uploadStatus}
                uploadProgress={uploadProgress}
            />
        </>
    );
}
