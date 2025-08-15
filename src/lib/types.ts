
export type TransmissionType = "youtube" | "tv";

export interface Event {
  id: string;
  name: string;
  date: Date;
  location: string;
  transmission: TransmissionType;
  color: string;
  operator: string;
}
