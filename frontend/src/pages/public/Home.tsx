import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api';
import { KosProfile, Room } from '../../types';
import { Building2, CheckCircle2, Phone, MapPin, ArrowRight } from 'lucide-react';

export default function Home() {
  const { data: kos } = useQuery<KosProfile>({
    queryKey: ['kos'],
    queryFn: () => api.get('/api/kos').then(res => res.data)
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ['rooms-featured'],
    queryFn: () => api.get('/api/rooms').then(res => res.data.slice(0, 3))
  });

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => api.get('/api/facilities').then(res => res.data)
  });

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative bg-teal-600 text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-700 to-teal-500 opacity-50"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            {kos?.name || 'Selamat Datang di KosKu'}
          </h1>
          <p className="text-xl md:text-2xl text-teal-100 max-w-3xl mx-auto">
            {kos?.tagline || 'Hunian nyaman, aman, dan strategis untuk Anda.'}
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/rooms"
              className="bg-white text-teal-700 px-8 py-3 rounded-full font-bold text-lg hover:bg-teal-50 transition-all flex items-center gap-2"
            >
              Lihat Kamar <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Rooms */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Kamar Tersedia</h2>
            <p className="text-gray-600">Pilih kamar yang sesuai dengan kebutuhan Anda.</p>
          </div>
          <Link to="/rooms" className="text-teal-600 font-semibold hover:underline">
            Lihat semua kamar
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {rooms?.map(room => (
            <Link
              key={room.id}
              to={`/rooms/${room.id}`}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
            >
              <div className="aspect-video bg-gray-200 relative">
                {room.media.find(m => m.is_cover)?.file_path ? (
                  <img
                    src={`/uploads/${room.media.find(m => m.is_cover)?.file_path}`}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <Building2 className="h-12 w-12" />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-teal-700">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(room.price_monthly)}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors">{room.name}</h3>
                <p className="text-gray-500 text-sm mb-4 capitalize">{room.room_type} • Lantai {room.floor}</p>
                <div className="flex flex-wrap gap-2">
                  {room.facilities.slice(0, 3).map(f => (
                    <span key={f.id} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {f.name}
                    </span>
                  ))}
                  {room.facilities.length > 3 && (
                    <span className="text-xs text-gray-400">+{room.facilities.length - 3} lainnya</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Facilities Section */}
      <section className="bg-gray-100 py-16 px-4">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Fasilitas Unggulan</h2>
            <p className="text-gray-600 mt-2">Kami menyediakan berbagai fasilitas untuk kenyamanan Anda.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {facilities?.map((f: any) => (
              <div key={f.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex flex-col items-center gap-3">
                <div className="h-12 w-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                   <CheckCircle2 className="h-6 w-6" />
                </div>
                <span className="font-semibold text-gray-800">{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rules & Info */}
      <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">Aturan & Informasi</h2>
          <div className="prose prose-teal text-gray-600 whitespace-pre-line">
            {kos?.rules || 'Aturan kos akan dicantumkan di sini.'}
          </div>
          <div className="space-y-4 pt-4">
             <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="h-5 w-5 text-teal-600" />
                <span>{kos?.address}, {kos?.city}</span>
             </div>
             {kos?.whatsapp && (
               <a 
                 href={`https://wa.me/${kos.whatsapp}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="inline-flex items-center gap-3 text-gray-700 hover:text-teal-600 transition-colors"
                >
                  <Phone className="h-5 w-5 text-teal-600" />
                  <span>WhatsApp: {kos.whatsapp}</span>
               </a>
             )}
          </div>
        </div>
        <div className="bg-gray-200 aspect-square rounded-3xl overflow-hidden shadow-inner flex items-center justify-center text-gray-400">
          {kos?.maps_url ? (
            <iframe
              src={kos.maps_url.replace('https://maps.google.com', 'https://www.google.com/maps/embed')}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
            ></iframe>
          ) : (
            <MapPin className="h-16 w-16" />
          )}
        </div>
      </section>
    </div>
  );
}
