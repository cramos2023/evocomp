import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronRight, ChevronLeft, Sparkles, CheckCircle2 } from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const steps = [
    {
      target: '#import-section',
      title: t('merit_admin.onboarding.step1_title'),
      content: t('merit_admin.onboarding.step1_content'),
      icon: Sparkles
    },
    {
      target: '#import-arrow-btn',
      title: t('merit_admin.onboarding.step2_title'),
      content: t('merit_admin.onboarding.step2_content'),
      icon: CheckCircle2
    },
    {
      target: '#scenario-list',
      title: t('merit_admin.onboarding.step3_title'),
      content: t('merit_admin.onboarding.step3_content'),
      placement: 'top' as const,
      icon: Sparkles
    },
    {
      target: '#new-scenario-btn',
      title: t('merit_admin.onboarding.step4_title'),
      content: t('merit_admin.onboarding.step4_content'),
      placement: 'left' as const,
      icon: CheckCircle2
    },
    {
      target: '#scenario-results-btn',
      title: t('merit_admin.onboarding.step5_title'),
      content: t('merit_admin.onboarding.step5_content'),
      placement: 'left' as const,
      icon: Sparkles // Assuming a default icon for the new step
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setCurrentStep(0);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-700"
        onClick={onClose}
      />

      {/* Tour Card */}
      <div className={`relative w-full max-w-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[32px] shadow-2xl overflow-hidden transform transition-all duration-500 ${
        isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
      }`}>
        {/* Header Decor */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[rgba(46,79,210,0.05)] to-transparent pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-[rgb(var(--bg-surface-2))] hover:bg-[rgb(var(--bg-surface))] rounded-full border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-all z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-10 pt-16 relative z-10 text-center">
          {/* Progress Indicator */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === currentStep 
                    ? 'w-8 bg-[rgb(var(--primary))] shadow-[0_0_12px_rgba(46,79,210,0.4)]' 
                    : i < currentStep ? 'w-1.5 bg-[rgb(var(--primary))]' : 'w-1.5 bg-[rgb(var(--border))]'
                }`}
              />
            ))}
          </div>

          {/* Icon Area */}
          <div className="relative mb-8 flex justify-center">
            <div className="w-20 h-20 bg-[rgb(var(--primary))] rounded-3xl flex items-center justify-center shadow-xl shadow-[rgba(46,79,210,0.3)] rotate-6 group hover:rotate-0 transition-transform duration-500">
              {React.createElement(steps[currentStep].icon, { className: "w-10 h-10 text-white" })}
            </div>
            {/* Animated Rings */}
            <div className="absolute inset-0 flex items-center justify-center -z-10">
              <div className="w-20 h-20 border-2 border-[rgb(var(--primary))] rounded-3xl animate-ping opacity-20" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-[rgb(var(--text-primary))] tracking-tighter mb-4 transition-all duration-500">
            {steps[currentStep].title}
          </h2>
          
          <p className="text-[rgb(var(--text-secondary))] text-lg font-bold leading-relaxed mb-10 min-h-[80px]">
            {steps[currentStep].content}
          </p>

          <div className="flex items-center justify-between gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-xs font-black text-[rgb(var(--text-muted))] uppercase tracking-widest hover:text-[rgb(var(--text-primary))] transition-colors"
            >
              {t('merit_admin.onboarding.skip')}
            </button>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <button 
                  onClick={prevStep}
                  className="p-4 bg-[rgb(var(--bg-surface-2))] hover:bg-[rgb(var(--bg-surface))] rounded-2xl border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              
              <button 
                onClick={nextStep}
                className="group flex items-center gap-3 bg-[rgb(var(--primary))] hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-[rgba(46,79,210,0.3)] transition-all active:scale-95"
              >
                {currentStep === steps.length - 1 
                  ? t('merit_admin.onboarding.finish') 
                  : t('merit_admin.onboarding.next')}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-[rgb(var(--bg-surface-2))] p-6 border-t border-[rgb(var(--border))] text-center">
            <p className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em]">
                EvoComp Intelligence Boarding Experience v1.0
            </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
