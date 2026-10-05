export interface ReportDetail {
  id: string;
  title: string;
  description: string;
  urgency: 'URGENT' | 'NORMAL';
  image: string;
  address: string;
  distance: string;
}

// Preview content only: no live report or mission is represented by this identifier.
export const reports: readonly ReportDetail[] = [{
  id: 'chat-blesse',
  title: 'Chat blessé',
  description: 'Un chat blessé a été trouvé près du parc.\nIl semble avoir une patte blessée.',
  urgency: 'URGENT',
  image: 'assets/images/animals/luna.webp',
  address: 'Avenue Habib Bourguiba, Tunis',
  distance: 'à 1,2 km',
}];
