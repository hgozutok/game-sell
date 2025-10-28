"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules"
import "swiper/css"
import "swiper/css/navigation"
import "swiper/css/pagination"
import "swiper/css/effect-fade"

interface SlideItem {
  id: string
  type: "banner" | "product"
  image: string
  title: string
  subtitle?: string
  link: string
  buttonText?: string
}

export default function HomeSlider() {
  const [slides, setSlides] = useState<SlideItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const { api } = await import("@/lib/api")
        const response = await api.get("/store/slider")
        
        if (response.data.slides && response.data.slides.length > 0) {
          const formattedSlides = response.data.slides.map((slide: any) => ({
            id: slide.id,
            type: "banner" as const,
            image: slide.image_url,
            title: slide.title,
            subtitle: slide.subtitle,
            link: slide.link_url,
            buttonText: slide.button_text
          }))
          setSlides(formattedSlides)
        } else {
          // Fallback to default slides if API returns nothing
          setSlides([
            {
              id: "1",
              type: "banner",
              image: "/slider-1.jpg",
              title: "Huge Summer Sale",
              subtitle: "Up to 80% off on selected games",
              link: "/deals",
              buttonText: "Shop Now"
            },
            {
              id: "2",
              type: "banner",
              image: "/slider-2.jpg",
              title: "New Releases",
              subtitle: "Get the latest games instantly",
              link: "/products?filter=new",
              buttonText: "Explore"
            }
          ])
        }
      } catch (error) {
        console.error("Failed to fetch slider:", error)
        // Use fallback slides on error
        setSlides([
          {
            id: "1",
            type: "banner",
            image: "/slider-1.jpg",
            title: "Huge Summer Sale",
            subtitle: "Up to 80% off on selected games",
            link: "/deals",
            buttonText: "Shop Now"
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchSlides()
  }, [])

  if (loading || slides.length === 0) {
    return (
      <div className="relative w-full h-[500px] md:h-[600px] mb-12 rounded-2xl overflow-hidden bg-[#15171c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[500px] md:h-[600px] mb-12 rounded-2xl overflow-hidden">
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        spaceBetween={0}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        effect="fade"
        loop={true}
        className="h-full"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div className="relative w-full h-full">
              {/* Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${slide.image})`,
                  filter: "brightness(0.6)"
                }}
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>

              {/* Content */}
              <div className="relative h-full container mx-auto px-4 flex items-center">
                <div className="max-w-2xl">
                  <h1 className="text-5xl md:text-7xl font-black text-white mb-4 leading-tight">
                    {slide.title}
                  </h1>
                  {slide.subtitle && (
                    <p className="text-xl md:text-2xl text-gray-200 mb-8">
                      {slide.subtitle}
                    </p>
                  )}
                  <Link
                    href={slide.link}
                    className="inline-block bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white px-10 py-4 rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-[#ff6b35]/50 transition-all transform hover:scale-105 uppercase tracking-wide"
                  >
                    {slide.buttonText || "Learn More"}
                  </Link>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <style jsx global>{`
        .swiper-button-next,
        .swiper-button-prev {
          color: #ff6b35;
          background: rgba(21, 23, 28, 0.8);
          width: 50px;
          height: 50px;
          border-radius: 50%;
          backdrop-filter: blur(10px);
        }

        .swiper-button-next:after,
        .swiper-button-prev:after {
          font-size: 20px;
          font-weight: bold;
        }

        .swiper-pagination-bullet {
          background: #fff;
          opacity: 0.5;
          width: 12px;
          height: 12px;
        }

        .swiper-pagination-bullet-active {
          background: #ff6b35;
          opacity: 1;
        }
      `}</style>
    </div>
  )
}

