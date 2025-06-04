// Custom Range Slider Implementation
class CustomRangeSlider {
    constructor(config) {
        this.sliderId = config.sliderId;
        this.handleMinId = config.handleMinId;
        this.handleMaxId = config.handleMaxId;
        this.selectedRangeId = config.selectedRangeId;
        this.valueDisplayId = config.valueDisplayId;
        this.minValue = config.minValue;
        this.maxValue = config.maxValue;
        this.initialMin = config.initialMin;
        this.initialMax = config.initialMax;
        this.onChange = config.onChange;

        this.sliderElement = document.getElementById(this.sliderId);
        this.handleMin = document.getElementById(this.handleMinId);
        this.handleMax = document.getElementById(this.handleMaxId);
        this.selectedRange = document.getElementById(this.selectedRangeId);
        this.valueDisplay = document.getElementById(this.valueDisplayId);

        if (!this.validateElements()) {
            console.error('Slider elements not found for:', this.sliderId);
            return;
        }

        this.trackWidth = this.sliderElement.offsetWidth;
        this.handleWidth = this.handleMin.offsetWidth;
        this.currentMin = this.initialMin;
        this.currentMax = this.initialMax;

        console.log(`Initializing ${this.sliderId} with values:`, {
            min: this.currentMin,
            max: this.currentMax,
            trackWidth: this.trackWidth,
            handleWidth: this.handleWidth
        });

        this.initializeSlider();
        this.setupEventListeners();
    }

    validateElements() {
        const isValid = this.sliderElement && this.handleMin && this.handleMax && 
                       this.selectedRange && this.valueDisplay;
        if (!isValid) {
            console.error('Missing elements for slider:', {
                slider: this.sliderElement,
                handleMin: this.handleMin,
                handleMax: this.handleMax,
                selectedRange: this.selectedRange,
                valueDisplay: this.valueDisplay
            });
        }
        return isValid;
    }

    valueToPercent(value) {
        return ((value - this.minValue) / (this.maxValue - this.minValue)) * 100;
    }

    positionToValue(pos) {
        const percent = (pos / this.trackWidth) * 100;
        let val = Math.round(((percent / 100) * (this.maxValue - this.minValue)) + this.minValue);
        return Math.max(this.minValue, Math.min(this.maxValue, val));
    }

    updateSliderVisuals() {
        const minPercent = this.valueToPercent(this.currentMin);
        const maxPercent = this.valueToPercent(this.currentMax);

        this.handleMin.style.left = `calc(${minPercent}% - ${this.handleWidth / 2}px)`;
        this.handleMax.style.left = `calc(${maxPercent}% - ${this.handleWidth / 2}px)`;
        
        this.selectedRange.style.left = `${minPercent}%`;
        this.selectedRange.style.width = `${maxPercent - minPercent}%`;

        this.valueDisplay.textContent = `${this.currentMin} - ${this.currentMax}`;

        console.log(`Updated ${this.sliderId} visuals:`, {
            min: this.currentMin,
            max: this.currentMax,
            minPercent,
            maxPercent
        });
    }

    initializeSlider() {
        this.updateSliderVisuals();
    }

    setupEventListeners() {
        this.makeDraggable(this.handleMin, true);
        this.makeDraggable(this.handleMax, false);

        // Update track width on window resize
        window.addEventListener('resize', () => {
            this.trackWidth = this.sliderElement.offsetWidth;
            this.updateSliderVisuals();
        });
    }

    makeDraggable(handle, isMinHandle) {
        handle.addEventListener('mousedown', (event) => {
            event.preventDefault();
            document.body.style.cursor = 'grabbing';
            handle.style.cursor = 'grabbing';

            const shiftX = event.clientX - handle.getBoundingClientRect().left;

            const moveAt = (pageX) => {
                let newLeft = pageX - shiftX - this.sliderElement.getBoundingClientRect().left;
                newLeft = Math.max(0, Math.min(this.trackWidth - this.handleWidth, newLeft));
                
                let newValue = this.positionToValue(newLeft + this.handleWidth / 2);

                if (isMinHandle) {
                    newValue = Math.min(newValue, this.currentMax);
                    this.currentMin = newValue;
                } else {
                    newValue = Math.max(newValue, this.currentMin);
                    this.currentMax = newValue;
                }
                
                this.updateSliderVisuals();
                if (this.onChange) {
                    this.onChange(this.currentMin, this.currentMax);
                }
            };

            const onMouseMove = (event) => {
                moveAt(event.pageX);
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = 'default';
                handle.style.cursor = 'grab';
                
                console.log(`${this.sliderId} value changed:`, {
                    min: this.currentMin,
                    max: this.currentMax
                });
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        handle.ondragstart = () => false;
    }

    getValues() {
        return {
            min: this.currentMin,
            max: this.currentMax
        };
    }
}

// Initialize sliders when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    
    // Heart Rate Range Slider
    const hrSlider = new CustomRangeSlider({
        sliderId: 'hr-range-slider-custom',
        handleMinId: 'hr-handle-min',
        handleMaxId: 'hr-handle-max',
        selectedRangeId: 'hr-selected-range',
        valueDisplayId: 'hr-value-display',
        minValue: 60,
        maxValue: 95,
        initialMin: 60,
        initialMax: 95,
        onChange: (min, max) => {
            console.log('HR slider changed:', { min, max });
            if (typeof applyChartFilters === 'function') {
                applyChartFilters();
            }
        }
    });

    // Make slider available globally for the chart filtering
    window.hrSlider = hrSlider;
    
    console.log('Custom range slider initialized:', {
        hrSlider: window.hrSlider
    });
}); 