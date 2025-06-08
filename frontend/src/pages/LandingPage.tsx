import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { 
  Smartphone, 
  Clock, 
  Users, 
  Shield, 
  ArrowRight, 
  Check, 
  Star,
  ChevronDown,
  ChevronUp,
  Calendar,
  Settings,
  CreditCard
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const benefits = [
    {
      icon: Smartphone,
      title: "Reservas desde celular en segundos",
      description: "Tus clientes reservan turnos desde cualquier dispositivo, 24/7"
    },
    {
      icon: Clock,
      title: "Reducción de ausentismo",
      description: "Recordatorios automáticos por WhatsApp y email"
    },
    {
      icon: Users,
      title: "Organizá tu agenda y equipo",
      description: "Gestiona múltiples profesionales y horarios sin esfuerzo"
    },
    {
      icon: Shield,
      title: "Seguro y confiable",
      description: "100% online, datos protegidos y respaldos automáticos"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Elegís tu plan",
      description: "Selecciona el plan que mejor se adapte a tu negocio",
      icon: CreditCard
    },
    {
      number: "2", 
      title: "Pagás y recibís acceso",
      description: "Pago online seguro y acceso inmediato a tu cuenta",
      icon: Settings
    },
    {
      number: "3",
      title: "Configurás y empezás",
      description: "Configura tus horarios y recibe turnos al instante",
      icon: Calendar
    }
  ];

  const plans = [
    {
      name: "Básico",
      ideal: "Profesionales individuales",
      price: "$4.900",
      period: "/mes",
      features: [
        "1 usuario",
        "Hasta 100 turnos/mes",
        "Recordatorios automáticos",
        "Calendario básico",
        "Soporte por email"
      ],
      cta: "Contratar Básico",
      popular: false,
      color: "border-gray-200"
    },
    {
      name: "Pro",
      ideal: "Equipos chicos o consultorios",
      price: "$9.900",
      period: "/mes",
      features: [
        "3 usuarios",
        "Turnos ilimitados",
        "Recordatorios automáticos",
        "Calendario avanzado",
        "Reportes básicos",
        "Soporte prioritario"
      ],
      cta: "Contratar Pro",
      popular: true,
      color: "border-purple-500"
    },
    {
      name: "Full",
      ideal: "Empresas o clínicas",
      price: "$14.900",
      period: "/mes",
      features: [
        "10 usuarios",
        "Turnos ilimitados",
        "Recordatorios automáticos",
        "Calendario completo",
        "Reportes avanzados",
        "Soporte prioritario 24/7",
        "Integración con WhatsApp"
      ],
      cta: "Contratar Full",
      popular: false,
      color: "border-gray-200"
    }
  ];

  const testimonials = [
    {
      name: "Dr. María González",
      business: "Clínica Dental",
      content: "Turnio revolucionó mi consulta. Ahora mis pacientes sacan turno en segundos y yo me dedico a lo que realmente importa.",
      rating: 5
    },
    {
      name: "Carlos Mendez",
      business: "Barbería Premium",
      content: "Desde que uso Turnio, reduje a cero las cancelaciones de último momento. Los recordatorios automáticos son geniales.",
      rating: 5
    },
    {
      name: "Ana Ruiz",
      business: "Centro de Estética",
      content: "Súper fácil de usar y mis clientas lo aman. La agenda se maneja sola y yo tengo más tiempo para atender.",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "¿Puedo cancelar cuando quiera?",
      answer: "Sí, puedes cancelar tu suscripción en cualquier momento sin penalidades. Tu cuenta permanecerá activa hasta el final del período pagado."
    },
    {
      question: "¿Tengo soporte técnico?",
      answer: "Todos nuestros planes incluyen soporte por email. Los planes Pro y Full tienen soporte prioritario con respuesta en menos de 2 horas."
    },
    {
      question: "¿Cómo me ayudan a configurarlo?",
      answer: "Te enviamos un tutorial paso a paso y nuestro equipo te acompaña en la configuración inicial sin costo adicional."
    },
    {
      question: "¿Es seguro?",
      answer: "Absolutamente. Usamos encriptación de nivel bancario y todos los datos se respaldan automáticamente en servidores seguros."
    },
    {
      question: "¿Qué necesito para empezar?",
      answer: "Solo necesitas una conexión a internet. Turnio funciona en cualquier dispositivo: computadora, tablet o celular."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header fijo */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo size="md" />
            
            {/* Menú de navegación */}
            <nav className="hidden md:flex space-x-8">
              <a href="#beneficios" className="text-gray-600 hover:text-purple-600 transition-colors">
                Beneficios
              </a>
              <a href="#planes" className="text-gray-600 hover:text-purple-600 transition-colors">
                Planes
              </a>
              <a href="#como-funciona" className="text-gray-600 hover:text-purple-600 transition-colors">
                Cómo funciona
              </a>
              <a href="#contratar" className="text-gray-600 hover:text-purple-600 transition-colors">
                Contratar
              </a>
            </nav>

            {/* CTA Header */}
            <Link 
              to="/register"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Empezar ahora
            </Link>
          </div>
        </div>
      </header>

      {/* Sección Hero */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
                Gestioná tus turnos en minutos. 
                <span className="text-purple-600"> Desde cualquier lugar</span>, 
                sin complicaciones.
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Turnio es la plataforma simple y rápida para gestionar turnos en tu negocio.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to="/register"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center"
                >
                  Probar gratis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <a 
                  href="#planes"
                  className="border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center"
                >
                  Ver planes
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    ¡Reservá tu turno!
                  </h3>
                  <p className="text-gray-600">Elegí día y horario</p>
                </div>
                
                {/* Simulación de calendario */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                    <div key={i} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                  {[...Array(35)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`text-center text-sm py-2 rounded ${
                        i === 15 ? 'bg-purple-600 text-white' : 
                        i > 5 && i < 30 ? 'text-gray-900 hover:bg-gray-100 cursor-pointer' : 
                        'text-gray-300'
                      }`}
                    >
                      {i > 5 && i < 30 ? i - 5 : ''}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {['9:00', '10:30', '14:00', '15:30'].map((time, i) => (
                    <div 
                      key={i}
                      className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                        i === 1 ? 'bg-purple-600 text-white border-purple-600' : 
                        'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {time}
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

      {/* Beneficios destacados */}
      <section id="beneficios" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir Turnio?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simplificamos la gestión de turnos para que puedas concentrarte en lo que realmente importa: tu negocio.
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

      {/* Cómo funciona */}
      <section id="como-funciona" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Cómo funciona
            </h2>
            <p className="text-xl text-gray-600">
              En solo 3 pasos simples tenés tu sistema listo para recibir turnos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-purple-600 font-bold text-lg shadow-lg">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gray-300 -z-10"></div>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planes y precios */}
      <section id="planes" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Planes y precios
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Elegí el plan perfecto para tu negocio
            </p>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full inline-block font-medium">
              ✨ Todos los planes incluyen prueba gratis de 7 días
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`relative border-2 ${plan.color} rounded-2xl p-8 ${
                  plan.popular ? 'scale-105 shadow-xl' : 'shadow-lg'
                } transition-transform hover:scale-105`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Más popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {plan.ideal}
                  </p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-gray-500 ml-1">
                      {plan.period}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-center transition-colors inline-block ${
                    plan.popular 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-xl text-gray-600">
              Miles de profesionales ya confían en Turnio
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

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Preguntas Frecuentes
            </h2>
            <p className="text-xl text-gray-600">
              Resolvemos todas tus dudas
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">
                    {faq.question}
                  </span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-700">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="contratar" className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            ¿Listo para revolucionar tu negocio?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Únete a miles de profesionales que ya optimizaron su gestión de turnos
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/register"
              className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center"
            >
              Empezar prueba gratis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <a 
              href="#planes"
              className="border-2 border-white text-white hover:bg-white hover:text-purple-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center"
            >
              Ver planes
            </a>
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
                La plataforma más simple para gestionar turnos en tu negocio.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Producto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#beneficios" className="hover:text-white transition-colors">Beneficios</a></li>
                <li><a href="#planes" className="hover:text-white transition-colors">Planes</a></li>
                <li><a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a></li>
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

export default LandingPage; 