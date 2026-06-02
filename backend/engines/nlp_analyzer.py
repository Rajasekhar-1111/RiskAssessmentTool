# NLP-Based Requirement Risk Analyzer
# Analyzes software requirements documents for ambiguity, incompleteness, and risk indicators
# Reference: ISO/IEC/IEEE 29148:2018, IEEE Std 830-1998

import re
import os


class NLPRequirementAnalyzer:
    """
    NLP engine for analyzing software requirement documents.
    Detects ambiguous language, incomplete requirements, complexity indicators,
    and risk patterns based on ISO/IEC/IEEE 29148:2018 quality attributes.
    
    Uses rule-based + keyword matching approach (suitable for academic scope).
    """

    def __init__(self):
        # Ambiguity indicators (ISO/IEC/IEEE 29148 weak phrases)
        self.ambiguity_keywords = [
            'may', 'might', 'could', 'would', 'should', 'can',
            'possibly', 'probably', 'perhaps', 'sometimes',
            'often', 'usually', 'generally', 'typically',
            'adequate', 'appropriate', 'reasonable', 'normal',
            'some', 'several', 'many', 'few', 'various',
            'etc', 'and so on', 'and/or', 'tbd', 'to be determined',
            'as needed', 'as appropriate', 'as required',
            'user-friendly', 'easy to use', 'intuitive',
            'fast', 'quick', 'efficient', 'flexible',
            'robust', 'scalable', 'reliable', 'secure',
            'minimal', 'maximum', 'sufficient', 'acceptable'
        ]

        # Incompleteness indicators
        self.incompleteness_patterns = [
            r'\btbd\b', r'\btbc\b', r'\btba\b',
            r'to be (determined|confirmed|decided|defined|specified)',
            r'not (yet|currently) (defined|specified|determined)',
            r'details? (will|to) (follow|be provided)',
            r'\[.*?\]',  # Placeholder brackets
            r'TODO', r'FIXME', r'HACK',
            r'placeholder',
            r'refer to .* for (more |additional )?details',
        ]

        # Complexity / risky patterns
        self.complexity_patterns = [
            r'real[- ]?time',
            r'concurrent(ly)?',
            r'parallel',
            r'distributed',
            r'legacy (system|code|integration)',
            r'third[- ]?party',
            r'external (api|service|system)',
            r'backward[s]? compatib',
            r'migrat(e|ion)',
            r'encrypt(ion|ed)',
            r'authenticat(e|ion)',
            r'multi[- ]?(tenant|thread|process)',
            r'cross[- ]?platform',
            r'high[- ]?availability',
            r'load[- ]?balanc',
            r'failover',
            r'disaster[- ]?recovery',
        ]

        # Positive quality indicators
        self.quality_indicators = [
            r'shall\b',  # IEEE standard for mandatory requirement
            r'must\b',
            r'the system (shall|must|will)',
            r'\d+\s*(ms|millisecond|second|minute|hour|day)',  # Measurable
            r'\d+\s*%',  # Quantified
            r'within \d+',  # Bounded
            r'at least \d+',
            r'no more than \d+',
            r'acceptance criteria',
            r'given .* when .* then',  # BDD format
        ]

    def analyze_text(self, text, document_name='requirements.txt'):
        """
        Analyze requirement text for risks and quality issues.

        Args:
            text: string containing the full requirement document
            document_name: name of the source document

        Returns:
            dict with findings, scores, and recommendations
        """
        if not text or len(text.strip()) < 10:
            return {
                'document_name': document_name,
                'error': 'Text too short to analyze',
                'findings': [],
                'risk_count': 0
            }

        lines = text.strip().split('\n')
        findings = []
        ambiguity_count = 0
        incompleteness_count = 0
        complexity_count = 0
        quality_count = 0
        total_requirements = 0

        for line_num, line in enumerate(lines, 1):
            line_stripped = line.strip()
            if not line_stripped or len(line_stripped) < 5:
                continue

            # Count as a requirement line if it contains meaningful content
            if len(line_stripped) > 15:
                total_requirements += 1

            line_lower = line_stripped.lower()

            # Check for ambiguity
            for keyword in self.ambiguity_keywords:
                pattern = r'\b' + re.escape(keyword) + r'\b'
                matches = re.finditer(pattern, line_lower)
                for match in matches:
                    ambiguity_count += 1
                    findings.append({
                        'type': 'ambiguity',
                        'severity': 'warning',
                        'line': line_num,
                        'text': line_stripped,
                        'keyword': keyword,
                        'position': match.start(),
                        'message': f'Ambiguous term "{keyword}" found. ISO/IEC/IEEE 29148 recommends using precise, measurable language.',
                        'suggestion': self._get_ambiguity_suggestion(keyword)
                    })
                    break  # One finding per keyword per line

            # Check for incompleteness
            for pattern in self.incompleteness_patterns:
                if re.search(pattern, line_stripped, re.IGNORECASE):
                    incompleteness_count += 1
                    findings.append({
                        'type': 'incompleteness',
                        'severity': 'error',
                        'line': line_num,
                        'text': line_stripped,
                        'message': 'Incomplete requirement detected. This needs to be fully specified before implementation.',
                        'suggestion': 'Replace placeholder with concrete, measurable requirement.'
                    })
                    break

            # Check for complexity / risk indicators
            for pattern in self.complexity_patterns:
                if re.search(pattern, line_stripped, re.IGNORECASE):
                    complexity_count += 1
                    findings.append({
                        'type': 'complexity',
                        'severity': 'info',
                        'line': line_num,
                        'text': line_stripped,
                        'message': f'Complex technical requirement detected. Consider additional risk assessment.',
                        'suggestion': 'Break down into smaller, testable sub-requirements. Add technical spike task.'
                    })
                    break

            # Check for quality indicators
            for pattern in self.quality_indicators:
                if re.search(pattern, line_stripped, re.IGNORECASE):
                    quality_count += 1
                    break

        # Calculate quality score (0-100)
        total_issues = ambiguity_count + incompleteness_count
        if total_requirements > 0:
            issue_ratio = total_issues / total_requirements
            quality_score = max(0, round(100 - (issue_ratio * 100), 2))
            quality_score = min(100, quality_score)

            # Bonus for quality indicators
            quality_bonus = min(20, (quality_count / total_requirements) * 30)
            quality_score = min(100, quality_score + quality_bonus)
        else:
            quality_score = 0

        # Risk level based on quality score
        if quality_score >= 80:
            risk_level = 'low'
        elif quality_score >= 60:
            risk_level = 'medium'
        elif quality_score >= 40:
            risk_level = 'high'
        else:
            risk_level = 'critical'

        # Summary statistics
        summary = {
            'total_lines': len(lines),
            'requirement_lines': total_requirements,
            'word_count': len(text.split()),
            'ambiguity_count': ambiguity_count,
            'incompleteness_count': incompleteness_count,
            'complexity_count': complexity_count,
            'quality_indicators': quality_count,
            'total_issues': total_issues + complexity_count
        }

        return {
            'document_name': document_name,
            'findings': findings[:100],  # Limit to top 100 findings
            'summary': summary,
            'quality_score': round(quality_score, 2),
            'risk_level': risk_level,
            'risk_count': total_issues,
            'ambiguity_count': ambiguity_count,
            'incompleteness_count': incompleteness_count,
            'recommendations': self._generate_recommendations(summary, quality_score)
        }

    def _get_ambiguity_suggestion(self, keyword):
        """Get specific suggestion for replacing ambiguous keyword"""
        suggestions = {
            'should': 'Replace with "shall" (mandatory) or "will" (declaration of intent)',
            'may': 'Replace with "shall" if mandatory, or remove if truly optional',
            'could': 'Specify exactly what the system must do',
            'fast': 'Specify exact performance metric (e.g., "within 200ms")',
            'quick': 'Define measurable response time',
            'efficient': 'Define specific efficiency metric (CPU, memory, throughput)',
            'user-friendly': 'Define specific usability criteria (e.g., "task completion in 3 clicks")',
            'easy to use': 'Specify measurable usability goals',
            'intuitive': 'Define specific UX criteria and user testing goals',
            'scalable': 'Define specific scaling targets (e.g., "support 10,000 concurrent users")',
            'reliable': 'Specify uptime requirement (e.g., "99.9% availability")',
            'secure': 'Define specific security requirements (encryption, auth, compliance)',
            'flexible': 'List specific configurations/customizations required',
            'robust': 'Define specific error handling and recovery requirements',
            'etc': 'List all items explicitly — do not use "etc."',
            'some': 'Specify exact quantity or range',
            'several': 'Specify exact count',
            'adequate': 'Define specific measurable criteria',
            'appropriate': 'Specify exactly what is appropriate',
            'minimal': 'Define the exact minimum value',
            'maximum': 'Specify exact maximum value with units',
        }
        return suggestions.get(keyword, f'Replace "{keyword}" with specific, measurable language')

    def _generate_recommendations(self, summary, quality_score):
        """Generate recommendations based on analysis"""
        recs = []

        if summary['ambiguity_count'] > 5:
            recs.append({
                'priority': 'high',
                'type': 'ambiguity',
                'message': f'{summary["ambiguity_count"]} ambiguous terms found. Conduct requirements review workshop to clarify all vague language.',
            })

        if summary['incompleteness_count'] > 0:
            recs.append({
                'priority': 'critical',
                'type': 'incompleteness',
                'message': f'{summary["incompleteness_count"]} incomplete requirements found. These MUST be resolved before development starts.',
            })

        if summary['complexity_count'] > 3:
            recs.append({
                'priority': 'medium',
                'type': 'complexity',
                'message': f'{summary["complexity_count"]} complex technical requirements detected. Consider technical spikes and POC activities.',
            })

        if summary['quality_indicators'] < summary['requirement_lines'] * 0.3:
            recs.append({
                'priority': 'medium',
                'type': 'quality',
                'message': 'Low quality indicator count. Use "shall" for mandatory requirements and include measurable acceptance criteria.',
            })

        if quality_score < 50:
            recs.append({
                'priority': 'critical',
                'type': 'overall',
                'message': 'Overall requirement quality is POOR. High risk of project failure due to unclear requirements. Full requirements rewrite recommended.',
            })

        return recs

    def extract_text_from_file(self, filepath):
        """Extract text from uploaded file (TXT, PDF, DOCX)"""
        ext = os.path.splitext(filepath)[1].lower()

        if ext == '.txt':
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()

        elif ext == '.pdf':
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(filepath)
                text = ''
                for page in reader.pages:
                    text += page.extract_text() or ''
                return text
            except Exception as e:
                return f"Error reading PDF: {str(e)}"

        elif ext in ['.docx']:
            try:
                from docx import Document
                doc = Document(filepath)
                text = '\n'.join([para.text for para in doc.paragraphs])
                return text
            except Exception as e:
                return f"Error reading DOCX: {str(e)}"

        else:
            return "Unsupported file format. Please use .txt, .pdf, or .docx"


# Singleton instance
nlp_analyzer = NLPRequirementAnalyzer()
