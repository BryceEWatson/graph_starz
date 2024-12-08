'use client';

import { Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export default function UploadModal({ 
    isOpen, 
    onClose, 
    imagePreview, 
    uploadStatus, 
    uploadProgress 
}) {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-background dark:bg-dark-background p-6 text-left align-middle shadow-xl transition-all">
                                <DialogTitle
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-text dark:text-dark-text flex justify-between items-center"
                                >
                                    <span>Uploading Image</span>
                                    <button
                                        onClick={onClose}
                                        className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5 text-text dark:text-dark-text" />
                                    </button>
                                </DialogTitle>

                                {imagePreview && (
                                    <div className="mt-4 relative aspect-video">
                                        <Image
                                            src={imagePreview}
                                            alt="Upload preview"
                                            fill
                                            className="rounded-lg object-contain"
                                        />
                                    </div>
                                )}

                                <div className="mt-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm text-text dark:text-dark-text">
                                            <span>{uploadStatus}</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
