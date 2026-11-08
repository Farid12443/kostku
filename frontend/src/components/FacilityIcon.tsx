import {
  AirVent,
  Archive,
  Bath,
  Bed,
  Bike,
  Car,
  CheckCircle2,
  CookingPot,
  LampDesk,
  Refrigerator,
  Shirt,
  Tv,
  Utensils,
  Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const FACILITY_ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  'air-vent': AirVent,
  bed: Bed,
  archive: Archive,
  bath: Bath,
  'lamp-desk': LampDesk,
  bike: Bike,
  car: Car,
  utensils: Utensils,
  'cooking-pot': CookingPot,
  refrigerator: Refrigerator,
  tv: Tv,
  shirt: Shirt,
};

export default function FacilityIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && FACILITY_ICONS[name]) || CheckCircle2;
  return <Icon className={className} aria-hidden />;
}
