/**
 * Search Algorithm for Analysis Methods
 *
 * Implements intelligent search and ranking of analysis methods
 * based on component, severity, scope, category, and keywords.
 */

import { ANALYSIS_METHODS, AnalysisMethod } from './methodIndex.js';

export interface SearchParams {
  component?: string;
  severity?: 'critical' | 'warning' | 'info';
  scope?: 'cluster' | 'namespace' | 'pod' | 'node' | 'container';
  category?: 'health' | 'performance' | 'configuration' | 'logs';
  keyword?: string;
  limit?: number;
}

interface ScoredMethod {
  method: AnalysisMethod;
  score: number;
}

/**
 * Search for analysis methods matching the given criteria
 */
export function searchAnalysisMethods(params: SearchParams): AnalysisMethod[] {
  let matches: ScoredMethod[] = ANALYSIS_METHODS.map(method => ({
    method,
    score: 0
  }));

  // Apply filters and calculate scores
  matches = matches.filter(m => {
    let include = true;
    let score = 0;

    // Exact component match (filter)
    if (params.component) {
      const componentMatch = m.method.component?.toLowerCase() === params.component.toLowerCase();
      if (!componentMatch) {
        include = false;
      } else {
        score += 50; // Boost for exact component match
      }
    }

    // Exact severity match (filter)
    if (params.severity) {
      if (m.method.severity !== params.severity) {
        include = false;
      } else {
        score += 30; // Boost for exact severity match
      }
    }

    // Exact scope match (filter)
    if (params.scope) {
      if (m.method.scope !== params.scope) {
        include = false;
      } else {
        score += 30; // Boost for exact scope match
      }
    }

    // Exact category match (filter)
    if (params.category) {
      if (m.method.category !== params.category) {
        include = false;
      } else {
        score += 30; // Boost for exact category match
      }
    }

    // Keyword scoring (filter + score)
    if (params.keyword) {
      const keywordScore = calculateKeywordScore(m.method, params.keyword);
      if (keywordScore === 0) {
        include = false;
      } else {
        score += keywordScore;
      }
    }

    m.score = score;
    return include;
  });

  // Sort by score (highest first), then alphabetically by name
  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.method.name.localeCompare(b.method.name);
  });

  // Apply limit
  const limit = params.limit || 10;
  const maxLimit = Math.min(limit, 50);

  return matches.slice(0, maxLimit).map(m => m.method);
}

/**
 * Calculate keyword match score for a method
 */
function calculateKeywordScore(method: AnalysisMethod, keyword: string): number {
  const kw = keyword.toLowerCase();
  let score = 0;

  // Exact match in method name (highest score)
  if (method.name.toLowerCase() === kw) {
    score += 100;
  } else if (method.name.toLowerCase().includes(kw)) {
    score += 80;
  }

  // Match in keywords array
  const keywordMatches = method.keywords.filter(k => {
    const kwLower = k.toLowerCase();
    return kwLower === kw || kwLower.includes(kw) || kw.includes(kwLower);
  });
  score += keywordMatches.length * 20;

  // Match in description
  if (method.description.toLowerCase().includes(kw)) {
    score += 10;
  }

  // Match in component
  if (method.component?.toLowerCase().includes(kw)) {
    score += 15;
  }

  // Partial word matches in method name
  const methodNameWords = method.name
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .split(/\s+/);

  if (methodNameWords.some(w => w.includes(kw) || kw.includes(w))) {
    score += 5;
  }

  return score;
}

/**
 * Get a suggested method for common queries
 */
export function getSuggestedMethod(query: string): AnalysisMethod | null {
  const queryLower = query.toLowerCase();

  // Common query patterns
  const patterns: Record<string, string> = {
    'what.*wrong': 'getDegradedOperators',
    'cluster.*health': 'getDegradedOperators',
    'failing.*pod': 'getFailingPods',
    'pod.*fail': 'getFailingPods',
    'etcd.*health': 'getEtcdHealth',
    'operator.*degraded': 'getDegradedOperators',
    'error.*event': 'getWarningEvents',
    'warning.*event': 'getWarningEvents'
  };

  for (const [pattern, methodName] of Object.entries(patterns)) {
    if (new RegExp(pattern).test(queryLower)) {
      const method = ANALYSIS_METHODS.find(m => m.name === methodName);
      if (method) {
        return method;
      }
    }
  }

  return null;
}
