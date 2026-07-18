let currentStepperStep = 1;
const totalSteps = 4;

function openStepperModal() {
    const modal = document.getElementById('waStepperModal');
    if(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        currentStepperStep = 1;
        updateStepperUI();
    }
}

function closeStepperModal() {
    const modal = document.getElementById('waStepperModal');
    if(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function updateStepperUI() {
    // Update steps content
    for(let i=1; i<=totalSteps; i++) {
        const step = document.getElementById(`step-${i}`);
        if(step) {
            if(i === currentStepperStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        }
    }

    // Update indicators
    for(let i=1; i<=totalSteps; i++) {
        const ind = document.getElementById(`ind-${i}`);
        if(ind) {
            ind.className = 'step-indicator';
            if(i < currentStepperStep) {
                ind.classList.add('complete');
                ind.innerHTML = '<i class="fas fa-check"></i>';
            } else if (i === currentStepperStep) {
                ind.classList.add('active');
                ind.innerHTML = i;
            } else {
                ind.innerHTML = i;
            }
        }
    }

    // Update buttons
    const btnBack = document.getElementById('stepperBack');
    const btnNext = document.getElementById('stepperNext');
    
    if(btnBack) {
        btnBack.disabled = (currentStepperStep === 1);
    }
    
    if(btnNext) {
        if(currentStepperStep === totalSteps) {
            btnNext.style.display = 'none';
        } else {
            btnNext.style.display = 'inline-block';
        }
    }
}

function nextStep() {
    if (currentStepperStep < totalSteps) {
        currentStepperStep++;
        updateStepperUI();
    }
}

function prevStep() {
    if (currentStepperStep > 1) {
        currentStepperStep--;
        updateStepperUI();
    }
}

window.openStepperModal = openStepperModal;
window.closeStepperModal = closeStepperModal;
window.nextStep = nextStep;
window.prevStep = prevStep;

window.submitWhatsAppForm = function() {
    const topic = document.getElementById('waTopic').value;
    const orderNumber = document.getElementById('waOrderNumber').value;
    const details = document.getElementById('waDetails').value;
    
    let message = `Hola, necesito ayuda con lo siguiente:\n\n*Tema:* ${topic}\n`;
    if (orderNumber && orderNumber.trim() !== '') {
        message += `*Pedido:* ${orderNumber.trim()}\n`;
    }
    message += `*Detalles:* ${details || 'Sin detalles adicionales'}`;
    
    const encodedMessage = encodeURIComponent(message);
    
    window.open(`https://wa.me/525574123521?text=${encodedMessage}`, '_blank');
    closeStepperModal();
};

