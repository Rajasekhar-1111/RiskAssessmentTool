# ML-Based Risk Prediction Engine
# Uses Random Forest classifier trained on project features
# Reference: IEEE Access 2025 - AI impact on SE phases

import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
import json
import os


class MLRiskPredictor:
    """
    Machine Learning-based risk prediction engine.
    Uses Random Forest to predict project risk level based on project attributes.
    Trained on synthetic dataset based on IEEE ICoDSE 2024 five-factor model.
    
    Features:
        - team_size
        - budget (normalized)
        - duration_months
        - complexity (encoded: low=1, medium=2, high=3, very_high=4)
        - team_experience_score (1-10)
        - technology_maturity (1-10)
        - requirement_stability (1-10)
        - methodology (encoded: waterfall=1, hybrid=2, agile=3)

    Outputs:
        - risk_level: low, medium, high, critical
        - failure_probability: 0.0 - 1.0
        - confidence: model confidence score
    """

    def __init__(self):
        self.model = None
        self.label_encoder = LabelEncoder()
        self._train_model()

    def _generate_training_data(self, n_samples=2000):
        """Generate synthetic training data based on IEEE research factors"""
        np.random.seed(42)

        # Feature generation
        team_size = np.random.randint(1, 50, n_samples)
        budget = np.random.uniform(5000, 5000000, n_samples)
        duration = np.random.uniform(1, 36, n_samples)
        complexity = np.random.choice([1, 2, 3, 4], n_samples, p=[0.15, 0.35, 0.35, 0.15])
        experience = np.random.uniform(1, 10, n_samples)
        tech_maturity = np.random.uniform(1, 10, n_samples)
        req_stability = np.random.uniform(1, 10, n_samples)
        methodology = np.random.choice([1, 2, 3], n_samples, p=[0.25, 0.35, 0.40])

        # Generate risk labels based on factor correlations (IEEE five-factor model)
        risk_scores = np.zeros(n_samples)

        # Higher complexity = higher risk
        risk_scores += complexity * 8

        # Lower experience = higher risk
        risk_scores += (10 - experience) * 6

        # Lower tech maturity = higher risk
        risk_scores += (10 - tech_maturity) * 4

        # Lower requirement stability = higher risk
        risk_scores += (10 - req_stability) * 7

        # Schedule pressure: large team + short duration = higher risk
        schedule_pressure = team_size / (duration + 1)
        risk_scores += np.clip(schedule_pressure * 3, 0, 20)

        # Budget per person per month (low = risk)
        budget_ratio = budget / (team_size * duration + 1)
        risk_scores -= np.clip(budget_ratio / 5000, 0, 10)

        # Agile methodology slightly reduces risk
        risk_scores -= (methodology - 1) * 3

        # Add noise
        risk_scores += np.random.normal(0, 5, n_samples)

        # Normalize to 0-100
        risk_scores = np.clip(risk_scores, 0, 100)

        # Categorize
        labels = []
        for score in risk_scores:
            if score < 25:
                labels.append('low')
            elif score < 50:
                labels.append('medium')
            elif score < 75:
                labels.append('high')
            else:
                labels.append('critical')

        X = np.column_stack([
            team_size,
            np.log1p(budget),  # Log-transform budget
            duration,
            complexity,
            experience,
            tech_maturity,
            req_stability,
            methodology
        ])

        return X, np.array(labels), risk_scores

    def _train_model(self):
        """Train the Random Forest model on synthetic data"""
        X, y, scores = self._generate_training_data()

        self.label_encoder.fit(['low', 'medium', 'high', 'critical'])
        y_encoded = self.label_encoder.transform(y)

        self.model = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            random_state=42
        )
        self.model.fit(X, y_encoded)

        # Also train failure probability regressor
        self.failure_model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=4,
            random_state=42
        )
        failure_labels = (scores > 60).astype(int)
        self.failure_model.fit(X, failure_labels)

    def predict(self, project_data):
        """
        Predict risk level for a project.

        Args:
            project_data: dict with keys:
                - team_size: int
                - budget: float
                - duration_months: float
                - complexity: str (low/medium/high/very_high)
                - team_experience: float (1-10)
                - technology_maturity: float (1-10)
                - requirement_stability: float (1-10)
                - methodology: str (waterfall/hybrid/agile)

        Returns:
            dict with prediction results
        """
        # Encode inputs
        complexity_map = {'low': 1, 'medium': 2, 'high': 3, 'very_high': 4}
        methodology_map = {'waterfall': 1, 'hybrid': 2, 'agile': 3}

        features = np.array([[
            float(project_data.get('team_size', 5)),
            np.log1p(float(project_data.get('budget', 100000))),
            float(project_data.get('duration_months', 6)),
            complexity_map.get(project_data.get('complexity', 'medium'), 2),
            float(project_data.get('team_experience', 5)),
            float(project_data.get('technology_maturity', 5)),
            float(project_data.get('requirement_stability', 5)),
            methodology_map.get(project_data.get('methodology', 'agile'), 3)
        ]])

        # Predict risk level
        prediction = self.model.predict(features)[0]
        probabilities = self.model.predict_proba(features)[0]
        risk_level = self.label_encoder.inverse_transform([prediction])[0]

        # Predict failure probability
        failure_prob = self.failure_model.predict_proba(features)[0]
        failure_probability = round(float(failure_prob[1]) if len(failure_prob) > 1 else 0.0, 3)

        # Feature importance
        feature_names = [
            'team_size', 'budget', 'duration', 'complexity',
            'experience', 'tech_maturity', 'req_stability', 'methodology'
        ]
        importances = self.model.feature_importances_
        feature_importance = {
            name: round(float(imp), 4)
            for name, imp in sorted(zip(feature_names, importances), key=lambda x: -x[1])
        }

        # Risk level probabilities
        class_probs = {}
        for idx, label in enumerate(self.label_encoder.classes_):
            class_probs[label] = round(float(probabilities[idx]), 4)

        # Risk score (0-100)
        risk_score = round(
            class_probs.get('medium', 0) * 35 +
            class_probs.get('high', 0) * 70 +
            class_probs.get('critical', 0) * 95 +
            class_probs.get('low', 0) * 10,
            2
        )

        # IEEE ICoDSE threshold check
        threshold_exceeded = failure_probability > 0.6

        return {
            'risk_level': risk_level,
            'risk_score': risk_score,
            'failure_probability': failure_probability,
            'threshold_exceeded': threshold_exceeded,
            'threshold_value': 0.6,
            'class_probabilities': class_probs,
            'confidence': round(float(max(probabilities)), 4),
            'feature_importance': feature_importance,
            'recommendation': self._get_recommendation(risk_level, failure_probability, feature_importance)
        }

    def _get_recommendation(self, risk_level, failure_prob, feature_importance):
        """Generate recommendation based on prediction"""
        top_factor = list(feature_importance.keys())[0]
        
        recs = {
            'critical': f'⚠ CRITICAL RISK: Failure probability {failure_prob:.1%}. Immediate project review required. Top risk factor: {top_factor}.',
            'high': f'⚡ HIGH RISK: Consider restructuring. Focus on improving {top_factor}. Implement weekly risk reviews.',
            'medium': f'📊 MODERATE RISK: Monitor {top_factor} closely. Establish regular risk checkpoints.',
            'low': f'✅ LOW RISK: Project parameters look healthy. Continue regular monitoring.'
        }
        return recs.get(risk_level, 'Monitor project risks regularly.')


# Singleton instance
ml_predictor = MLRiskPredictor()
