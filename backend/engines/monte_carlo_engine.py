# Monte Carlo Simulation Engine
# Simulates project schedule and cost outcomes using PERT distributions
# Reference: IEEE research on quantitative risk analysis

import numpy as np
from scipy import stats


class MonteCarloEngine:
    """
    Monte Carlo simulation engine for project schedule and cost risk analysis.
    Uses PERT (Beta) distributions based on three-point estimates to model
    uncertainty in task durations and costs.
    
    Reference: IEEE/MDPI 2024 - Monte Carlo Simulation in Project Management
    """

    def __init__(self, iterations=5000):
        self.iterations = iterations

    def _pert_distribution(self, optimistic, most_likely, pessimistic, size=1):
        """
        Generate random samples from a PERT (modified Beta) distribution.
        PERT mean = (O + 4M + P) / 6
        """
        if optimistic >= pessimistic:
            return np.full(size, most_likely)

        # PERT parameters
        mean = (optimistic + 4 * most_likely + pessimistic) / 6
        
        # Shape parameter (lambda = 4 is standard PERT)
        lam = 4
        
        # Convert to Beta distribution parameters
        alpha = 1 + lam * (mean - optimistic) / (pessimistic - optimistic)
        beta_param = 1 + lam * (pessimistic - mean) / (pessimistic - optimistic)
        
        # Ensure valid parameters
        alpha = max(alpha, 1.01)
        beta_param = max(beta_param, 1.01)

        # Generate beta samples and scale to [optimistic, pessimistic]
        samples = np.random.beta(alpha, beta_param, size)
        scaled = optimistic + samples * (pessimistic - optimistic)
        
        return scaled

    def simulate_schedule(self, tasks):
        """
        Run Monte Carlo simulation on project schedule.

        Args:
            tasks: list of dicts with keys:
                - name: task name
                - optimistic: optimistic duration (days)
                - most_likely: most likely duration (days)
                - pessimistic: pessimistic duration (days)
                - cost_per_day: cost per day (optional)

        Returns:
            dict with simulation results
        """
        n_tasks = len(tasks)
        if n_tasks == 0:
            return {'error': 'No tasks provided'}

        # Run simulation
        total_durations = np.zeros(self.iterations)
        total_costs = np.zeros(self.iterations)
        task_results = []

        for task in tasks:
            opt = float(task.get('optimistic', 1))
            ml = float(task.get('most_likely', 3))
            pes = float(task.get('pessimistic', 7))
            cost_per_day = float(task.get('cost_per_day', 0))

            # Generate samples
            samples = self._pert_distribution(opt, ml, pes, self.iterations)
            total_durations += samples

            if cost_per_day > 0:
                total_costs += samples * cost_per_day

            # Per-task statistics
            task_results.append({
                'name': task['name'],
                'pert_estimate': round((opt + 4 * ml + pes) / 6, 2),
                'mean_duration': round(np.mean(samples), 2),
                'std_dev': round(np.std(samples), 2),
                'p10': round(np.percentile(samples, 10), 2),
                'p50': round(np.percentile(samples, 50), 2),
                'p90': round(np.percentile(samples, 90), 2),
                'min': round(np.min(samples), 2),
                'max': round(np.max(samples), 2)
            })

        # Overall schedule statistics
        mean_duration = round(np.mean(total_durations), 2)
        std_duration = round(np.std(total_durations), 2)

        # Probability distribution (histogram data for frontend)
        hist_counts, hist_edges = np.histogram(total_durations, bins=50)
        histogram = {
            'counts': hist_counts.tolist(),
            'edges': [round(e, 2) for e in hist_edges.tolist()],
            'bin_centers': [round((hist_edges[i] + hist_edges[i+1]) / 2, 2) for i in range(len(hist_counts))]
        }

        # Cumulative probability (S-curve data)
        sorted_durations = np.sort(total_durations)
        cumulative_probs = np.linspace(0, 100, len(sorted_durations))
        # Sample every nth point for chart efficiency
        step = max(1, len(sorted_durations) // 100)
        s_curve = {
            'durations': [round(d, 2) for d in sorted_durations[::step].tolist()],
            'probabilities': [round(p, 2) for p in cumulative_probs[::step].tolist()]
        }

        # Percentile targets
        percentiles = {}
        for p in [10, 25, 50, 75, 80, 90, 95]:
            percentiles[f'p{p}'] = round(np.percentile(total_durations, p), 2)

        result = {
            'iterations': self.iterations,
            'task_count': n_tasks,
            'schedule': {
                'mean': mean_duration,
                'std_dev': std_duration,
                'min': round(np.min(total_durations), 2),
                'max': round(np.max(total_durations), 2),
                'percentiles': percentiles,
                'confidence_80': {
                    'lower': round(np.percentile(total_durations, 10), 2),
                    'upper': round(np.percentile(total_durations, 90), 2)
                }
            },
            'histogram': histogram,
            's_curve': s_curve,
            'task_results': task_results
        }

        # Cost analysis (if cost data provided)
        if np.any(total_costs > 0):
            result['cost'] = {
                'mean': round(np.mean(total_costs), 2),
                'std_dev': round(np.std(total_costs), 2),
                'min': round(np.min(total_costs), 2),
                'max': round(np.max(total_costs), 2),
                'percentiles': {
                    f'p{p}': round(np.percentile(total_costs, p), 2)
                    for p in [10, 25, 50, 75, 90, 95]
                }
            }

        return result

    def deadline_probability(self, tasks, deadline_days):
        """
        Calculate the probability of completing all tasks within a deadline.

        Args:
            tasks: list of task dicts
            deadline_days: target deadline in days

        Returns:
            Probability (0-100) of meeting the deadline
        """
        total_durations = np.zeros(self.iterations)

        for task in tasks:
            opt = float(task.get('optimistic', 1))
            ml = float(task.get('most_likely', 3))
            pes = float(task.get('pessimistic', 7))
            samples = self._pert_distribution(opt, ml, pes, self.iterations)
            total_durations += samples

        probability = np.mean(total_durations <= deadline_days) * 100
        return round(probability, 2)


# Singleton instance
monte_carlo_engine = MonteCarloEngine()
