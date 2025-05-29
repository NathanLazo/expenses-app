const RECENT_EVIDENCES_KEY = "recent_evidences";
const MAX_RECENT_EVIDENCES = 5;

const isLocalStorageAvailable = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    return true;
  } catch (e) {
    return false;
  }
};

export interface RecentEvidence {
  url: string;
  title: string;
  timestamp: number;
}

export const addRecentEvidence = (url: string, title: string): void => {
  if (!isLocalStorageAvailable()) return;

  try {
    // Obtener el arreglo actual de localStorage
    const storedEvidences = localStorage.getItem(RECENT_EVIDENCES_KEY);
    let recentEvidences: RecentEvidence[] = storedEvidences
      ? (JSON.parse(storedEvidences) as RecentEvidence[])
      : [];

    // Crear nuevo objeto de evidencia
    const newEvidence: RecentEvidence = {
      url,
      title,
      timestamp: Date.now(),
    };

    // Filtrar duplicados y agregar la nueva evidencia al inicio
    recentEvidences = recentEvidences.filter(
      (evidence) => evidence.url !== url,
    );
    recentEvidences.unshift(newEvidence);

    // Limitar a MAX_RECENT_EVIDENCES elementos
    recentEvidences = recentEvidences.slice(0, MAX_RECENT_EVIDENCES);

    // Guardar en localStorage
    localStorage.setItem(RECENT_EVIDENCES_KEY, JSON.stringify(recentEvidences));
  } catch (error) {
    console.error("Error al guardar evidencia reciente:", error);
  }
};

export const getRecentEvidences = (): RecentEvidence[] => {
  if (!isLocalStorageAvailable()) return [];

  try {
    const storedEvidences = localStorage.getItem(RECENT_EVIDENCES_KEY);
    return storedEvidences
      ? (JSON.parse(storedEvidences) as RecentEvidence[])
      : [];
  } catch (error) {
    console.error("Error al obtener evidencias recientes:", error);
    return [];
  }
};
