import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { 
  Scissors, 
  Clock, 
  Users, 
  Smartphone, 
  Check, 
  ArrowRight,
  Star,
  Calendar,
  MessageCircle,
  Shield
} from 'lucide-react';

const PeluqueriaPage: React.FC = () => {
  const benefits = [
    {
      icon: Scissors,
      title: "Gestión de cortes y servicios",
      description: "Organizá todos tus servicios: cortes, peinados, coloración, tratamientos y más con precios y duraciones personalizadas"
    },
    {
      icon: Clock,
      title: "Horarios flexibles",
      description: "Configurá horarios diferentes para cada peluquero, días de descanso y horarios especiales"
    },
    {
      icon: Users,
      title: "Múltiples profesionales",
      description: "Gestioná un equipo completo de peluqueros con especialidades y horarios individuales"
    },
    {
      icon: Smartphone,
      title: "Reservas desde el celular",
      description: "Tus clientes reservan turnos 24/7 desde cualquier dispositivo móvil"
    }
  ];

  const testimonials = [
    {
      name: "María González",
      business: "Salón María - Palermo",
      content: "Turnio revolucionó mi peluquería. Ahora mis clientas reservan turnos online y yo me dedico a lo que realmente importa: hacerlas sentir hermosas.",
      rating: 5
    },
    {
      name: "Carlos Mendez",
      business: "Barbería Premium - CABA",
      content: "El mejor software para peluquerías. Mis clientes reservan desde el celular y nunca más tengo problemas con la agenda.",
      rating: 5
    },
    {
      name: "Ana Ruiz",
      business: "Centro de Belleza Ana - Córdoba",
      content: "Desde que uso Turnio, mi peluquería funciona como un reloj. Los recordatorios automáticos son geniales.",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "¿Turnio funciona para peluquerías pequeñas y grandes?",
      answer: "Sí, Turnio está diseñado para peluquerías de todos los tamaños. Desde salones con un solo peluquero hasta grandes centros de belleza con múltiples profesionales."
    },
    {
      question: "¿Puedo configurar diferentes servicios y precios?",
      answer: "Absolutamente. Podés configurar todos tus servicios: cortes, peinados, coloración, tratamientos, manicura, pedicura, etc. con precios y duraciones personalizadas."
    },
    {
      question: "¿Cómo funcionan las reservas para peluquerías?",
      answer: "Tus clientas pueden reservar turnos online 24/7, elegir el peluquero, el servicio y el horario. Reciben confirmación inmediata y recordatorios automáticos."
    },
    {
      question: "¿Puedo gestionar múltiples peluqueros?",
      answer: "Sí, Turnio te permite gestionar un equipo completo de peluqueros con horarios individuales, especialidades y disponibilidad personalizada."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo size="md" />
            <div className="flex gap-2 md:gap-3">
              <Link 
                to="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-6 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors whitespace-nowrap"
              >
                Acceder
              </Link>
              <Link 
                to="/register"
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 md:px-6 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors whitespace-nowrap"
              >
                Empezar
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
                Software de gestión de turnos para peluquerías en Argentina
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                <strong>Turnio es la aplicación argentina</strong> diseñada específicamente para peluquerías y salones de belleza. 
                <span className="text-purple-600 font-semibold"> Automatizá tus reservas y ahorrá tiempo</span> con nuestro sistema de turnos online.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to="/register"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center"
                >
                  Probar gratis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link 
                  to="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center"
                >
                  Acceder
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    ¡Reservá tu turno!
                  </h3>
                  <p className="text-gray-600">Elegí peluquero y horario</p>
                </div>
                
                <div className="space-y-3 mb-4">
                  {['María - Cortes', 'Carlos - Barba', 'Ana - Coloración', 'Luis - Tratamientos'].map((service, i) => (
                    <div 
                      key={i}
                      className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                        i === 1 ? 'bg-purple-600 text-white border-purple-600' : 
                        'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {service}
                    </div>
                  ))}
                </div>

                <button className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold mt-4 transition-colors">
                  Confirmar turno
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios específicos para peluquerías */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Hecho especialmente para peluquerías argentinas
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nuestro <strong>sistema de turnos para peluquerías</strong> está diseñado para el mercado argentino. 
              <strong> Simplificamos la gestión de turnos</strong> para que puedas concentrarte en hacer sentir hermosas a tus clientas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center p-6 rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonios de peluquerías */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Lo que dicen las peluquerías que usan Turnio
            </h2>
            <p className="text-xl text-gray-600">
              Cientos de salones de belleza ya confían en Turnio
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <p className="font-semibold text-gray-900">
                    {testimonial.name}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {testimonial.business}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ específicas para peluquerías */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Preguntas Frecuentes para Peluquerías
            </h2>
            <p className="text-xl text-gray-600">
              Todo lo que necesitás saber sobre Turnio para tu peluquería
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-700">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            ¿Lista para revolucionar tu peluquería?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Únete a cientos de peluquerías que ya optimizaron su gestión de turnos con Turnio
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/register"
              className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center"
            >
              Empezar prueba gratis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link 
              to="/"
              className="border-2 border-white text-white hover:bg-white hover:text-purple-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center"
            >
              Ver todos los planes
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Logo size="md" showText={true} textColor="light" className="mb-4" />
              <p className="text-gray-400">
                El software de gestión de turnos más simple para peluquerías argentinas.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Para Peluquerías</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/turnos-peluqueria-argentina" className="hover:text-white transition-colors">Sistema de turnos</Link></li>
                <li><Link to="/turnos-salon-belleza-argentina" className="hover:text-white transition-colors">Salones de belleza</Link></li>
                <li><Link to="/planes" className="hover:text-white transition-colors">Planes y precios</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Soporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="mailto:soporte@turnio.com" className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Centro de ayuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Estado del servicio</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Política de privacidad</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Términos y condiciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Política de cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Turnio. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PeluqueriaPage;
