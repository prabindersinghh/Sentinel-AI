// ML ensemble scoring utilities
export function generateMLEnsembleScore(scenario: 'normal' | 'mule' | 'social-eng') {
  let baseScore: number;
  let lgbmScore: number;
  let lstmScore: number;
  let gnnScore: number;
  let ifoScore: number;

  if (scenario === 'normal') {
    baseScore = Math.floor(Math.random() * 60 + 40); // 40-100
    lgbmScore = Math.floor(Math.random() * 50 + 30);
    lstmScore = Math.floor(Math.random() * 40 + 20);
    gnnScore = Math.floor(Math.random() * 35 + 15);
    ifoScore = Math.floor(Math.random() * 30 + 10);
  } else if (scenario === 'mule') {
    baseScore = Math.floor(Math.random() * 60 + 120); // 120-180
    lgbmScore = Math.floor(Math.random() * 50 + 100);
    lstmScore = Math.floor(Math.random() * 40 + 80);
    gnnScore = Math.floor(Math.random() * 40 + 100); // GNN detects graph anomaly
    ifoScore = Math.floor(Math.random() * 40 + 80);
  } else {
    // social-eng
    baseScore = Math.floor(Math.random() * 60 + 160); // 160-200
    lgbmScore = Math.floor(Math.random() * 40 + 150);
    lstmScore = Math.floor(Math.random() * 40 + 150);
    gnnScore = Math.floor(Math.random() * 30 + 160);
    ifoScore = Math.floor(Math.random() * 30 + 160);
  }

  // Features based on scenario
  const features = [
    {
      name: 'DEVICE_TRUSTED',
      value: scenario === 'social-eng' ? false : true,
      type: 'boolean (L2)',
    },
    {
      name: 'HASH_MATCH',
      value: scenario === 'mule' ? false : true,
      type: 'boolean (L2)',
    },
    {
      name: 'DAYS_SINCE_REGISTRATION',
      value: Math.floor(Math.random() * 180 + 30),
      type: 'uint16 (L2)',
    },
    {
      name: 'TELECOM_RISK_SCORE',
      value: scenario === 'social-eng' ? 180 : Math.floor(Math.random() * 100),
      type: 'uint16 0-200 (L3)',
    },
    {
      name: 'SCREEN_SHARE_ACTIVE',
      value: scenario === 'social-eng',
      type: 'boolean (L3)',
    },
    {
      name: 'CROSS_BANK_SEEN',
      value: scenario === 'mule',
      type: 'boolean (L2)',
    },
    {
      name: 'PORTED_RECENTLY',
      value: Math.random() < 0.1,
      type: 'boolean (L3)',
    },
    {
      name: 'ICCID_CHANGED',
      value: scenario === 'mule' ? true : Math.random() < 0.05,
      type: 'boolean (L3)',
    },
  ];

  const shap = [
    {
      feature: 'SCREEN_SHARE_ACTIVE (CRITICAL)',
      contribution: scenario === 'social-eng' ? 180 : 0,
      impact: scenario === 'social-eng' ? 'HIGH' : 'LOW',
    },
    {
      feature: 'CROSS_BANK_SEEN',
      contribution: scenario === 'mule' ? 140 : 0,
      impact: scenario === 'mule' ? 'HIGH' : 'LOW',
    },
    {
      feature: 'DEVICE_TRUSTED (inverse)',
      contribution: scenario === 'social-eng' ? 120 : 20,
      impact: 'MEDIUM',
    },
    {
      feature: 'TELECOM_RISK_SCORE',
      contribution: scenario === 'social-eng' ? 160 : 30,
      impact: scenario === 'social-eng' ? 'HIGH' : 'MEDIUM',
    },
    {
      feature: 'DAYS_SINCE_REGISTRATION',
      contribution: 40,
      impact: 'MEDIUM',
    },
    {
      feature: 'ICCID_CHANGED',
      contribution: scenario === 'mule' ? 100 : 10,
      impact: scenario === 'mule' ? 'HIGH' : 'LOW',
    },
  ];

  return {
    lgbmScore,
    lstmScore,
    gnnScore,
    ifoScore,
    baseScore,
    shap,
    features,
  };
}
