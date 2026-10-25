import "leaflet/dist/leaflet.css";
import * as React from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import { useRealtime } from "@/hooks/use-realtime";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Search, MapPin } from "lucide-react";
import { formatDistance } from "@/types";

const ICON_URL = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const ICON_SHADOW = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: ICON_URL,
  shadowUrl: ICON_SHADOW,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapPage() {
  const { facility } = useAuth();
  const [facilities, setFacilities] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [inventories, setInventories] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [radiusKm, setRadiusKm] = React.useState("25");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    load();
  }, []);

  useRealtime(
    ["demo_reset"],
    () => {
      load();
    }
  );

  async function load() {
    setLoading(true);
    try {
      const [fs, its, inv] = await Promise.all([api.facilities(), api.items(), api.inventories()]);
      setFacilities(fs);
      setItems(its);
      setInventories(inv);
    } finally {
      setLoading(false);
    }
  }

  const facilityById = Object.fromEntries(facilities.map((f) => [f.id, f]));
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));

  function inventorySummary(facId: string) {
    const facInv = inventories.filter((i) => i.facility_id === facId);
    let total = 0, critical = 0, low = 0;
    for (const i of facInv) {
      const avail = Math.max(0, i.quantity_on_hand - i.quantity_reserved);
      total += avail;
      if (avail <= 0) critical++;
      else if (avail < i.min_threshold) low++;
    }
    return { total, critical, low };
  }

  function distanceToMy(lat: number, lon: number) {
    if (!facility) return null;
    const my = facilityById[facility.id];
    if (!my) return null;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat - my.latitude);
    const dLon = toRad(lon - my.longitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(my.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  if (loading) {
    return (
      <div className="flex h-screen flex-col">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="text-xl font-bold text-slate-900">Operations Map</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse rounded-full h-32 w-32 bg-slate-100" />
        </div>
      </div>
    );
  }

  const myFac = facilityById[facility!.id];
  const centerPos: [number, number] = [myFac.latitude, myFac.longitude];

  return (
    <div className="flex h-screen flex-col">
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">Operations Map</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="pl-9 pr-3 h-9 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 w-64" placeholder="Search facility..." />
          </div>
          <Select value={radiusKm} onValueChange={setRadiusKm}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder={radiusKm + " km radius"} /></SelectTrigger>
            <SelectContent>
              {[5, 10, 25, 50, 100].map((r) => <SelectItem key={r} value={String(r)}>{r} km</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-1 relative">
        <MapContainer center={centerPos} zoom={11} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Circle center={centerPos} radius={Number(radiusKm) * 1000} color="#2563eb" fillOpacity={0.08} weight={1} />
          {facilities.map((f) => {
            const summary = inventorySummary(f.id);
            const dist = distanceToMy(f.latitude, f.longitude);
            return (
              <Marker key={f.id} position={[f.latitude, f.longitude] as [number, number]} icon={DefaultIcon}>
                <Popup>
                  <div className="min-w-[220px]">
                    <div className="font-bold text-slate-900">{f.name}</div>
                    <div className="text-xs text-slate-500 capitalize">{f.type}</div>
                    <div className="text-xs text-slate-500 mt-1">{dist ? formatDistance(dist) : "—"} from {facility?.name}</div>
                    <Separator className="my-2" />
                    <div className="text-sm">Available: <span className="font-medium">{summary.total}</span> units</div>
                    {summary.critical > 0 && <div className="text-xs text-red-600 font-medium">{summary.critical} critical item(s)</div>}
                    {summary.low > 0 && <div className="text-xs text-amber-600 font-medium">{summary.low} low item(s)</div>}
                    <Button size="sm" onClick={() => setSelected(f.id === selected ? null : f.id)} className="w-full mt-2">
                      {selected === f.id ? "Selected" : "Select"}
                    </Button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
          <Badge className="bg-blue-600 text-white text-xs px-2 py-1 rounded">Your facility</Badge>
          <Badge className="bg-red-600 text-white text-xs px-2 py-1 rounded">Selected facility</Badge>
          <Badge className="bg-green-600 text-white text-xs px-2 py-1 rounded">Supplying hub</Badge>
          <span className="text-[10px] text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">Straight-line distance — illustrative, not a road route</span>
        </div>
      </div>
      <div className="h-72 border-t border-slate-200 bg-white p-4 overflow-y-auto">
        <CardHeader className="p-2 pb-1">
          <CardTitle className="text-sm font-medium">Facility Detail</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {selected ? (() => {
            const f = facilityById[selected];
            if (!f) return <p className="text-xs text-slate-400">Select a facility on the map.</p>;
            const facInv = inventories.filter((i) => i.facility_id === f.id);
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{f.name}</div>
                  <Badge className="bg-green-100 text-green-700 border-green-200">{f.type}</Badge>
                </div>
                <div className="text-xs text-slate-500">{f.address || f.region}</div>
                <div className="text-xs text-slate-500">{distanceToMy(f.latitude, f.longitude) ? formatDistance(distanceToMy(f.latitude, f.longitude)!) : "—"} from {facility?.name}</div>
                <Separator className="my-2" />
                {facInv.length === 0 ? (
                  <p className="text-xs text-slate-400">No inventory reported.</p>
                ) : (
                  facInv.map((i) => {
                    const it = itemById[i.item_id];
                    const avail = Math.max(0, i.quantity_on_hand - i.quantity_reserved);
                    return (
                      <div key={i.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">{it?.name}</span>
                          {it?.blood_group && <span className="text-[10px] font-mono text-slate-500">({it.blood_group})</span>}
                        </div>
                        <span className={avail <= 0 ? "text-red-600 font-medium" : avail < i.min_threshold ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>
                          {avail} {it?.unit}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })() : (
            <p className="text-xs text-slate-400 text-center py-4">Click a facility marker to view its inventory summary.</p>
          )}
        </CardContent>
      </div>
    </div>
  );
}

export default MapPage;
