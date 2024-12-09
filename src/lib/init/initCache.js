// Cache to store initialization state
let initializationState = {
    initialized: false,
    inProgress: false,
    result: null,
    error: null,
    lastInitTime: null,
    initStartTime: null
};

const MAX_INIT_TIME = 30000; // 30 seconds
const MIN_INIT_INTERVAL = 5000; // 5 seconds

/**
 * Get the current initialization state
 * @returns {Object} The current initialization state
 */
export function getInitializationState() {
    // Check for timeout
    const now = new Date();
    if (initializationState.inProgress && 
        initializationState.initStartTime && 
        now - new Date(initializationState.initStartTime).getTime() > MAX_INIT_TIME) {
        resetInitializationState();
        initializationState.error = 'Initialization timed out';
    }
    return { ...initializationState };
}

/**
 * Check if initialization can be attempted
 * @returns {boolean} True if initialization can be attempted
 */
export function canAttemptInitialization() {
    const now = new Date();
    if (!initializationState.lastInitTime) return true;
    return now - new Date(initializationState.lastInitTime).getTime() > MIN_INIT_INTERVAL;
}

/**
 * Set the initialization state
 * @param {Object} state The new state to merge with current state
 */
export function setInitializationState(state) {
    const now = new Date();
    
    // If starting initialization, record start time
    if (state.inProgress && !initializationState.inProgress) {
        state.initStartTime = now.toISOString();
    }
    
    // If initialization failed or completed, ensure inProgress is false
    const shouldResetProgress = state.error !== undefined || state.initialized === true;
    
    initializationState = {
        ...initializationState,
        ...state,
        inProgress: shouldResetProgress ? false : state.inProgress,
        lastInitTime: now.toISOString()
    };
}

/**
 * Mark initialization as failed with an error message
 * @param {string} error The error message
 */
export function markInitializationFailed(error) {
    setInitializationState({
        initialized: false,
        inProgress: false,
        error: error || 'Initialization failed'
    });
}

/**
 * Reset initialization state to initial values
 */
export function resetInitializationState() {
    initializationState = {
        initialized: false,
        inProgress: false,
        result: null,
        error: null,
        lastInitTime: null,
        initStartTime: null
    };
}
