import { SYNONYM_MAP, DOMAIN_AFFINITIES } from './taxonomy.service.js';

/**
 * Drishti AI - Skill Relationship Network Graph Engine
 * Generates maintainable node-link graphs derived from the canonical skill taxonomy,
 * domain affinities, and real candidate pool & job requisition demand.
 */

// Skill metadata descriptions for contextual inspection
const SKILL_DESCRIPTIONS = {
  javascript: 'High-level, interpreted scripting language conforming to ECMAScript standard for client & server.',
  typescript: 'Strict syntactical superset of JavaScript adding static typing and class-based OOP.',
  react: 'Declarative component-based UI library developed by Meta for web and mobile interfaces.',
  'node.js': "Asynchronous event-driven JavaScript runtime built on Chrome's V8 engine.",
  express: 'Fast, unopinionated, minimalist web framework for Node.js REST services.',
  mongodb: 'Document-oriented NoSQL database program using JSON-like BSON schemas.',
  postgresql: 'Advanced open-source relational database emphasizing SQL compliance and extensibility.',
  mysql: 'Popular open-source relational database management system using structured query language.',
  docker: 'Containerization platform packaging applications and dependencies into standardized containers.',
  kubernetes: 'Production-grade container orchestration system automating deployment and scaling.',
  aws: 'Comprehensive on-demand cloud computing platform providing compute, storage, and networking.',
  gcp: 'Suite of cloud computing services running on the same infrastructure Google uses internally.',
  azure: 'Cloud computing platform operated by Microsoft for application management.',
  terraform: 'Infrastructure as Code software tool enabling infrastructure creation and versioning.',
  python: 'Interpreted, high-level, general-purpose programming language widely used in AI, data, and web.',
  java: 'Object-oriented, class-based programming language designed to have few implementation dependencies.',
  redis: 'In-memory data structure store used as a distributed, in-memory key-value database and cache.',
  'ci/cd': 'Continuous integration and continuous delivery automation practices for reliable releases.',
  'rest apis': 'Representational State Transfer architectural style for stateless distributed hypermedia systems.',
  graphql: 'Query language for APIs and runtime for fulfilling queries with existing data.',
  tailwind: 'Utility-first CSS framework packed with classes that can be composed directly in markup.',
  linux: 'Open-source Unix-like operating system kernel underpinning global cloud servers and containers.',
};

export function buildSkillOntologyGraph(resumes = [], jobs = [], options = {}) {
  const { categoryFilter, searchQuery, minConnections = 0 } = options;

  // 1. Tally candidate holdings and job demand across active database records
  const candidateSkillCounts = {};
  const jobSkillCounts = {};

  resumes.forEach((r) => {
    (r.skills || []).forEach((s) => {
      const name = (typeof s === 'string' ? s : s.name).toLowerCase();
      candidateSkillCounts[name] = (candidateSkillCounts[name] || 0) + 1;
    });
  });

  jobs.forEach((j) => {
    (j.requiredSkills || []).forEach((s) => {
      const name = (typeof s === 'string' ? s : s.name).toLowerCase();
      jobSkillCounts[name] = (jobSkillCounts[name] || 0) + 1;
    });
    (j.preferredSkills || []).forEach((s) => {
      const name = (typeof s === 'string' ? s : s.name).toLowerCase();
      jobSkillCounts[name] = (jobSkillCounts[name] || 0) + 0.5;
    });
  });

  // 2. Build Nodes from SYNONYM_MAP canonical skills
  const nodes = [];
  const nodeMap = new Map();

  for (const [canonicalKey, aliases] of Object.entries(SYNONYM_MAP)) {
    // Determine category
    let category = 'Language / Core';
    if (['react', 'tailwind', 'vue', 'angular'].includes(canonicalKey)) category = 'Frontend Framework';
    else if (['node.js', 'express', 'spring boot', 'fastapi'].includes(canonicalKey)) category = 'Backend Runtime';
    else if (['mongodb', 'postgresql', 'mysql', 'redis'].includes(canonicalKey)) category = 'Database Storage';
    else if (['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'linux'].includes(canonicalKey)) category = 'Cloud & DevOps';
    else if (['rest apis', 'graphql'].includes(canonicalKey)) category = 'API Architecture';

    // Sum candidate holding across aliases
    let cCount = candidateSkillCounts[canonicalKey] || 0;
    aliases.forEach((a) => {
      if (a !== canonicalKey && candidateSkillCounts[a]) {
        cCount += candidateSkillCounts[a];
      }
    });

    let jCount = jobSkillCounts[canonicalKey] || 0;
    aliases.forEach((a) => {
      if (a !== canonicalKey && jobSkillCounts[a]) {
        jCount += jobSkillCounts[a];
      }
    });

    const node = {
      id: canonicalKey,
      name: canonicalKey.charAt(0).toUpperCase() + canonicalKey.slice(1),
      category,
      aliases: aliases.filter((a) => a !== canonicalKey),
      description: SKILL_DESCRIPTIONS[canonicalKey] || `Production technical skill and ecosystem capability in ${canonicalKey}.`,
      candidateCount: cCount,
      jobCount: Math.round(jCount),
      degree: 0,
    };

    nodes.push(node);
    nodeMap.set(canonicalKey, node);
  }

  // 3. Build Links
  const links = [];
  const linkKeySet = new Set();

  function addLink(source, target, type, confidence, description) {
    if (!nodeMap.has(source) || !nodeMap.has(target) || source === target) return;
    const sortedKey = [source, target].sort().join('--') + `--${type}`;
    if (linkKeySet.has(sortedKey)) return;
    linkKeySet.add(sortedKey);

    links.push({
      source,
      target,
      type,
      confidence,
      description,
    });

    nodeMap.get(source).degree += 1;
    nodeMap.get(target).degree += 1;
  }

  // 3a. Add Domain Affinity Edges
  DOMAIN_AFFINITIES.forEach((domain) => {
    const list = domain.skills;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        addLink(
          list[i],
          list[j],
          'affinity',
          domain.affinityScore,
          `Domain Affinity: ${domain.domain}. ${domain.explanation}`
        );
      }
    }
  });

  // 3b. Add Prerequisite / Stack Synergy Edges
  addLink('typescript', 'javascript', 'prerequisite', 0.95, 'TypeScript compiles to and requires foundational JavaScript knowledge.');
  addLink('react', 'javascript', 'prerequisite', 0.90, 'React component authoring requires modern JavaScript fundamentals.');
  addLink('express', 'node.js', 'prerequisite', 0.95, 'Express is an application framework executed natively on Node.js runtime.');
  addLink('kubernetes', 'docker', 'prerequisite', 0.85, 'Kubernetes orchestrates standardized Docker and OCI container images.');
  addLink('terraform', 'aws', 'synergy', 0.85, 'Terraform automates infrastructure-as-code resource provisioning in AWS.');
  addLink('graphql', 'rest apis', 'synergy', 0.80, 'Alternative and complementary API architecture paradigms.');

  // 4. Apply Filters
  let filteredNodes = nodes;
  if (categoryFilter && categoryFilter !== 'all') {
    filteredNodes = filteredNodes.filter((n) => n.category.toLowerCase() === categoryFilter.toLowerCase());
  }

  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredNodes = filteredNodes.filter(
      (n) => n.id.includes(query) || n.name.toLowerCase().includes(query) || n.aliases.some((a) => a.includes(query))
    );
  }

  const activeNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredLinks = links.filter((l) => activeNodeIds.has(l.source) && activeNodeIds.has(l.target));

  return {
    nodes: filteredNodes,
    links: filteredLinks,
    summary: {
      totalSkills: filteredNodes.length,
      totalRelationships: filteredLinks.length,
      categories: Array.from(new Set(nodes.map((n) => n.category))),
    },
  };
}
