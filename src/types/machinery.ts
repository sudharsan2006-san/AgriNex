export type MachineryType =
  | "Tractor"
  | "Harvester"
  | "Rotavator"
  | "Cultivator"
  | "Seed Drill"
  | "Power Tiller"
  | "Tractor Trailer"
  | "Sprayer"
  | "Thresher"
  | "Plough"
  | "Paddy Transplanter"
  | "Reaper"
  | "Weeder"
  | "Baler"
  | "Water Pump"
  | "Other";

export type MachineryStatus = "Available" | "Booked" | "Maintenance" | "Unavailable";

export type MachineryRequestStatus =
  | "Pending Approval"
  | "Approved"
  | "Booked"
  | "Completed"
  | "Rejected";

export type FarmingActivityType =
  | "Land Preparation"
  | "Ploughing"
  | "Sowing"
  | "Spraying"
  | "Harvesting"
  | "Transportation"
  | "Threshing"
  | "Baling"
  | "Other";

export interface MachineryItem {
  id: string;
  name: string;
  type: MachineryType;
  provider: string;
  providerPhone?: string;
  location: string;
  price: number;
  rateUnit: "Day" | "Hour" | "Acre";
  status: MachineryStatus;
  description: string;
  imageUrl?: string;
  horsePower?: string;
  fuelType?: string;
  modelYear?: string;
  capacity?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface MachineryRequest {
  id: string;
  requestId: string;
  farmerId: string;
  farmerName: string;
  farmerEmail: string;
  farmerPhone: string;
  machineryId: string;
  machineryName: string;
  machineryType: MachineryType;
  provider: string;
  price: number;
  rateUnit: string;
  requiredDate: string;
  duration: string;
  farmLocation: string;
  activity: FarmingActivityType;
  contractId?: string;
  cropName?: string;
  notes?: string;
  status: MachineryRequestStatus;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt?: any;
  updatedAt?: any;
  approvedAt?: any;
}
