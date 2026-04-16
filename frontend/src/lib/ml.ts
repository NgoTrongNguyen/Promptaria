export interface PredictWeaponResponse {
  similarities: {
    melee: number;
    ranged: number;
  };
}

export interface TerrainResponse {
  result: number[][];
}

const API_BASE = 'http://localhost:8000';

export async function predictWeapon(pixels: number[], size: number): Promise<PredictWeaponResponse> {
  const response = await fetch(`${API_BASE}/predict-weapon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pixels, size }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to predict weapon stats');
  }
  
  return response.json();
}

export async function generateTerrain(): Promise<TerrainResponse> {
  const response = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Matrix: 'generate' }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate terrain');
  }
  
  return response.json();
}
