# Fuzzy Logic Risk Scoring Engine
# Based on IEEE research: handles subjective/linguistic risk inputs
# Converts qualitative assessments to quantitative risk scores

import numpy as np


class FuzzyRiskEngine:
    """
    Fuzzy Logic-based risk assessment engine.
    Maps linguistic variables (Low/Medium/High) to numerical risk scores
    using triangular membership functions and rule-based inference.
    
    Reference: IEEE ICoDSE 2024, Fuzzy Bayesian Inference for Software Risk
    """

    def __init__(self):
        # Universe of discourse: 0 to 10
        self.universe = np.linspace(0, 10, 100)

        # Define triangular membership functions
        self.membership_functions = {
            'very_low': self._trimf([0, 0, 2.5]),
            'low': self._trimf([0, 2.5, 5]),
            'medium': self._trimf([2.5, 5, 7.5]),
            'high': self._trimf([5, 7.5, 10]),
            'very_high': self._trimf([7.5, 10, 10])
        }

    def _trimf(self, params):
        """Triangular membership function"""
        a, b, c = params
        result = np.zeros_like(self.universe)
        for i, x in enumerate(self.universe):
            if x <= a or x >= c:
                result[i] = 0.0
            elif a < x <= b:
                result[i] = (x - a) / (b - a) if b != a else 1.0
            elif b < x < c:
                result[i] = (c - x) / (c - b) if c != b else 1.0
        return result

    def _fuzzify(self, value, label):
        """Get membership degree for a value in a given fuzzy set"""
        idx = int(value / 10 * 99)
        idx = max(0, min(idx, 99))
        return self.membership_functions[label][idx]

    def assess_risk(self, factors):
        """
        Assess risk using multiple fuzzy factors.

        Args:
            factors: dict with keys like:
                - requirement_stability (0-10)
                - team_experience (0-10)
                - technology_maturity (0-10)
                - project_complexity (0-10)
                - schedule_pressure (0-10)
                - resource_availability (0-10)
                - stakeholder_involvement (0-10)
                - requirement_clarity (0-10)

        Returns:
            dict with risk_score, risk_level, factor_analysis, and recommendations
        """
        factor_scores = {}
        risk_contributions = []

        # Risk factor weights (based on SEI taxonomy importance)
        weights = {
            'requirement_stability': 0.18,
            'team_experience': 0.14,
            'technology_maturity': 0.12,
            'project_complexity': 0.16,
            'schedule_pressure': 0.12,
            'resource_availability': 0.10,
            'stakeholder_involvement': 0.08,
            'requirement_clarity': 0.10
        }

        # Risk direction: some factors are "higher = less risk" (inverted)
        inverted_factors = ['team_experience', 'technology_maturity', 'resource_availability',
                           'stakeholder_involvement', 'requirement_clarity', 'requirement_stability']

        total_weighted_risk = 0

        for factor_name, value in factors.items():
            if factor_name not in weights:
                continue

            value = max(0, min(10, float(value)))

            # For inverted factors: high value = low risk
            risk_value = (10 - value) if factor_name in inverted_factors else value

            # Fuzzify and determine dominant level
            memberships = {}
            for label in self.membership_functions:
                memberships[label] = self._fuzzify(risk_value, label)

            dominant_level = max(memberships, key=memberships.get)
            dominant_degree = memberships[dominant_level]

            # Defuzzify using centroid method (simplified)
            risk_score = risk_value * 10  # Scale to 0-100

            weight = weights.get(factor_name, 0.1)
            weighted_score = risk_score * weight
            total_weighted_risk += weighted_score

            factor_scores[factor_name] = {
                'input_value': value,
                'risk_value': round(risk_value, 2),
                'risk_score': round(risk_score, 2),
                'dominant_level': dominant_level,
                'membership_degree': round(dominant_degree, 3),
                'weight': weight,
                'weighted_contribution': round(weighted_score, 2)
            }

            if risk_score >= 60:
                risk_contributions.append({
                    'factor': factor_name,
                    'score': round(risk_score, 2),
                    'level': dominant_level
                })

        # Overall risk score (0-100)
        overall_score = round(total_weighted_risk, 2)

        # Determine overall risk level
        if overall_score >= 70:
            risk_level = 'critical'
        elif overall_score >= 50:
            risk_level = 'high'
        elif overall_score >= 30:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        # Generate recommendations
        recommendations = self._generate_recommendations(factor_scores, risk_level)

        return {
            'overall_risk_score': overall_score,
            'risk_level': risk_level,
            'factor_analysis': factor_scores,
            'top_risk_factors': sorted(risk_contributions, key=lambda x: x['score'], reverse=True),
            'recommendations': recommendations
        }

    def _generate_recommendations(self, factor_scores, risk_level):
        """Generate actionable recommendations based on factor analysis"""
        recommendations = []

        for factor, data in factor_scores.items():
            if data['risk_score'] >= 70:
                if factor == 'requirement_stability':
                    recommendations.append({
                        'priority': 'critical',
                        'factor': factor,
                        'action': 'Freeze requirements immediately. Implement formal change control process.'
                    })
                elif factor == 'team_experience':
                    recommendations.append({
                        'priority': 'critical',
                        'factor': factor,
                        'action': 'Assign experienced mentors. Consider hiring senior developers or training.'
                    })
                elif factor == 'technology_maturity':
                    recommendations.append({
                        'priority': 'high',
                        'factor': factor,
                        'action': 'Conduct technology spike/proof-of-concept. Have fallback technology plan.'
                    })
                elif factor == 'project_complexity':
                    recommendations.append({
                        'priority': 'critical',
                        'factor': factor,
                        'action': 'Break project into smaller modules. Use incremental delivery approach.'
                    })
                elif factor == 'schedule_pressure':
                    recommendations.append({
                        'priority': 'high',
                        'factor': factor,
                        'action': 'Negotiate deadline extension. Reduce scope or add resources.'
                    })
                elif factor == 'resource_availability':
                    recommendations.append({
                        'priority': 'high',
                        'factor': factor,
                        'action': 'Secure resource commitments. Cross-train team members for backup.'
                    })
                elif factor == 'requirement_clarity':
                    recommendations.append({
                        'priority': 'high',
                        'factor': factor,
                        'action': 'Conduct requirements workshops with stakeholders. Create detailed use cases.'
                    })
            elif data['risk_score'] >= 50:
                recommendations.append({
                    'priority': 'medium',
                    'factor': factor,
                    'action': f'Monitor {factor.replace("_", " ")} closely. Review in next sprint planning.'
                })

        if risk_level == 'critical':
            recommendations.insert(0, {
                'priority': 'critical',
                'factor': 'overall',
                'action': 'PROJECT AT CRITICAL RISK. Immediate management review required. Consider project restructuring.'
            })

        return recommendations


# Singleton instance
fuzzy_engine = FuzzyRiskEngine()
