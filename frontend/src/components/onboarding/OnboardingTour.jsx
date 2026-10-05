import { useEffect, useState } from "react";
import onboardingSteps from "./onboardingSteps";
import "./OnboardingTour.css";

function OnboardingTour({ restaurantId }) {
  const storageKey = `dineflow_onboarding_${restaurantId || "restaurant"}`;

  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState(null);

  const step = onboardingSteps[currentStep];

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    const completed = localStorage.getItem(storageKey);

    if (completed === "completed") {
      return;
    }

    const timer = setTimeout(() => {
      setVisible(true);
    }, 700);

    return () => clearTimeout(timer);
  }, [restaurantId, storageKey]);

  useEffect(() => {
    if (!visible || !step) {
      return;
    }

    const updateTargetPosition = () => {
      const element = document.querySelector(
        step.target
      );

      if (!element) {
        setTargetRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();

      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    updateTargetPosition();

    window.addEventListener(
      "resize",
      updateTargetPosition
    );

    window.addEventListener(
      "scroll",
      updateTargetPosition,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateTargetPosition
      );

      window.removeEventListener(
        "scroll",
        updateTargetPosition,
        true
      );
    };
  }, [visible, currentStep, step]);

  useEffect(() => {
    if (!visible || !step) {
      return;
    }

    const element = document.querySelector(
      step.target
    );

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [visible, currentStep, step]);

  const closeTour = () => {
    localStorage.setItem(
      storageKey,
      "completed"
    );

    setVisible(false);
  };

  const nextStep = () => {
    if (
      currentStep ===
      onboardingSteps.length - 1
    ) {
      closeTour();
      return;
    }

    setCurrentStep(
      (current) => current + 1
    );
  };

  const previousStep = () => {
    setCurrentStep(
      (current) => Math.max(current - 1, 0)
    );
  };

  if (!visible || !step) {
    return null;
  }

  return (
    <div className="onboarding-tour">

      <div className="onboarding-overlay" />

      {targetRect && (
        <div
          className="onboarding-spotlight"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      <div className="onboarding-card">

        <div className="onboarding-card-icon">
          {step.icon}
        </div>

        <div className="onboarding-card-content">

          <div className="onboarding-step-count">
            STEP {currentStep + 1} OF{" "}
            {onboardingSteps.length}
          </div>

          <h2>
            {step.title}
          </h2>

          <p>
            {step.description}
          </p>

          <div className="onboarding-progress">
            {onboardingSteps.map(
              (_, index) => (
                <span
                  key={index}
                  className={
                    index === currentStep
                      ? "active"
                      : index < currentStep
                      ? "completed"
                      : ""
                  }
                />
              )
            )}
          </div>

          <div className="onboarding-actions">

            <button
              type="button"
              className="onboarding-skip"
              onClick={closeTour}
            >
              Skip tour
            </button>

            <div className="onboarding-navigation">

              {currentStep > 0 && (
                <button
                  type="button"
                  className="onboarding-back"
                  onClick={previousStep}
                >
                  ← Back
                </button>
              )}

              <button
                type="button"
                className="onboarding-next"
                onClick={nextStep}
              >
                {currentStep ===
                onboardingSteps.length - 1
                  ? "Finish"
                  : "Next →"}
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export default OnboardingTour;