import { Injectable, signal, inject, DestroyRef } from '@angular/core';
import { db } from './firebase';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';

export interface Theme {
  id: string;
  name: string;
  category: string;
  previewUrl: string;
  price: number;
  features: string[];
  description: string;
  demoUrl: string;
  htmlContent?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themes = signal<Theme[]>([]);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.initThemesListener();
  }

  private initThemesListener() {
    const themesQuery = query(collection(db, 'themes'));
    const unsubscribe = onSnapshot(themesQuery, (snapshot) => {
      const themesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Theme[];
      this.themes.set(themesData);
    }, (error) => {
      console.error('Error fetching themes:', error);
    });

    this.destroyRef.onDestroy(() => unsubscribe());
  }

  getThemes() {
    return this.themes.asReadonly();
  }

  getThemeById(id: string) {
    return this.themes().find(t => t.id === id);
  }

  async addTheme(theme: Omit<Theme, 'id'>) {
    const newDocRef = doc(collection(db, 'themes'));
    await setDoc(newDocRef, { ...theme, id: newDocRef.id });
  }

  async updateTheme(id: string, theme: Partial<Theme>) {
    const docRef = doc(db, 'themes', id);
    await updateDoc(docRef, theme);
  }

  async deleteTheme(id: string) {
    const docRef = doc(db, 'themes', id);
    await deleteDoc(docRef);
  }

  async seedThemes() {
    const attractiveThemes: Omit<Theme, 'id'>[] = [
      {
        name: 'Nexus Pro Business',
        category: 'Website Design',
        previewUrl: 'https://picsum.photos/seed/nexus/1200/800',
        price: 4999,
        features: ['Bento Grid Layout', 'Dark Mode Support', 'SEO Optimized', 'Custom Animations', 'Service Management'],
        description: 'A cutting-edge business theme with a modern bento-grid layout, smooth transitions, and comprehensive service management tools.',
        demoUrl: 'https://nexus-pro.demo'
      },
      {
        name: 'Lumina Fashion Shop',
        category: 'E-Commerce',
        previewUrl: 'https://picsum.photos/seed/lumina/1200/800',
        price: 7999,
        features: ['Product Quick View', 'Advanced Filtering', 'Multi-currency', 'Wishlist', 'Inventory Sync'],
        description: 'A premium e-commerce theme designed for high-conversion fashion and lifestyle brands. Includes advanced filtering and inventory management.',
        demoUrl: 'https://lumina-shop.demo'
      },
      {
        name: 'Aura Creative Portfolio',
        category: 'Website Design',
        previewUrl: 'https://picsum.photos/seed/aura/1200/800',
        price: 3499,
        features: ['Horizontal Scroll', 'Case Study Templates', 'Blog Integration', 'Contact Form', 'Interactive Gallery'],
        description: 'Minimalist and elegant portfolio theme for creative professionals and agencies. Showcase your work with interactive galleries.',
        demoUrl: 'https://aura-portfolio.demo'
      },
      {
        name: 'Zenith SaaS Landing',
        category: 'Landing Page',
        previewUrl: 'https://picsum.photos/seed/zenith/1200/800',
        price: 5999,
        features: ['Pricing Tables', 'Testimonial Slider', 'Feature Comparison', 'Lead Capture', 'Analytics Dashboard'],
        description: 'The ultimate landing page for SaaS products, focusing on clarity, conversion, and built-in analytics visualization.',
        demoUrl: 'https://zenith-saas.demo'
      },
      {
        name: 'Vogue Lifestyle Blog',
        category: 'Blog',
        previewUrl: 'https://picsum.photos/seed/vogue/1200/800',
        price: 2999,
        features: ['Typography Focused', 'Newsletter Popup', 'Social Sharing', 'Reading Progress', 'Ad Management'],
        description: 'A sophisticated blog theme for lifestyle, fashion, and travel enthusiasts. Optimized for readability and monetization.',
        demoUrl: 'https://vogue-editorial.demo'
      },
      {
        name: 'Gourmet Kitchen',
        category: 'Restaurant',
        previewUrl: 'https://picsum.photos/seed/gourmet/1200/800',
        price: 3999,
        features: ['Online Reservation', 'Digital Menu', 'Instagram Feed', 'Location Map', 'Review System'],
        description: 'Elegant restaurant theme with seamless online reservations and a beautiful digital menu showcase.',
        demoUrl: 'https://gourmet.demo'
      },
      {
        name: 'EduStream Academy',
        category: 'Education',
        previewUrl: 'https://picsum.photos/seed/edu/1200/800',
        price: 6999,
        features: ['LMS Integration', 'Course Catalog', 'Student Dashboard', 'Quiz System', 'Certificate Builder'],
        description: 'A complete learning management system theme for online academies and educational institutions.',
        demoUrl: 'https://edustream.demo'
      },
      {
        name: 'Vitality Wellness',
        category: 'Business',
        previewUrl: 'https://picsum.photos/seed/vitality/1200/800',
        price: 4499,
        features: ['Appointment Booking', 'Service List', 'Doctor Profiles', 'Health Blog', 'Patient Portal'],
        description: 'A clean and professional theme for healthcare providers, spas, and wellness centers.',
        demoUrl: 'https://vitality.demo'
      },
      {
        name: 'Stellar Tech Startup',
        category: 'Landing Page',
        previewUrl: 'https://picsum.photos/seed/stellar/1200/800',
        price: 5499,
        features: ['3D Illustrations', 'Waitlist Form', 'Investor Deck', 'Team Showcase', 'Roadmap Timeline'],
        description: 'A futuristic landing page designed for tech startups to attract early adopters and investors.',
        demoUrl: 'https://stellar-startup.demo'
      },
      {
        name: 'Nomad Travel Agency',
        category: 'Travel',
        previewUrl: 'https://picsum.photos/seed/nomad/1200/800',
        price: 6499,
        features: ['Destination Guides', 'Tour Booking', 'Interactive Maps', 'Customer Reviews', 'Currency Converter'],
        description: 'An immersive travel agency theme with built-in booking systems and interactive destination maps.',
        demoUrl: 'https://nomad-travel.demo'
      },
      {
        name: 'Artisan Bakery',
        category: 'Restaurant',
        previewUrl: 'https://picsum.photos/seed/artisan/1200/800',
        price: 3499,
        features: ['Online Ordering', 'Daily Specials', 'Allergen Info', 'Catering Request', 'Gallery'],
        description: 'A warm and inviting theme for local bakeries and cafes, featuring online ordering for pickup.',
        demoUrl: 'https://artisan-bakery.demo'
      },
      {
        name: 'Pulse Fitness Studio',
        category: 'Health & Fitness',
        previewUrl: 'https://picsum.photos/seed/pulse/1200/800',
        price: 4999,
        features: ['Class Schedule', 'Trainer Profiles', 'Membership Plans', 'BMI Calculator', 'Video Library'],
        description: 'A high-energy theme for gyms and fitness studios with integrated class scheduling and membership management.',
        demoUrl: 'https://pulse-fitness.demo'
      },
      {
        name: 'Haven Real Estate',
        category: 'Real Estate',
        previewUrl: 'https://picsum.photos/seed/haven/1200/800',
        price: 8999,
        features: ['Property Search', 'Virtual Tours', 'Agent Directory', 'Mortgage Calculator', 'Saved Listings'],
        description: 'A comprehensive real estate theme with advanced property search and virtual tour capabilities.',
        demoUrl: 'https://haven-realestate.demo'
      },
      {
        name: 'Craftsman Services',
        category: 'Services',
        previewUrl: 'https://picsum.photos/seed/craftsman/1200/800',
        price: 3999,
        features: ['Quote Request', 'Service Areas', 'Before/After Gallery', 'Testimonials', 'Emergency Contact'],
        description: 'A trustworthy theme for plumbers, electricians, and home repair services with easy quote requests.',
        demoUrl: 'https://craftsman-services.demo'
      },
      {
        name: 'Echo Podcaster',
        category: 'Media',
        previewUrl: 'https://picsum.photos/seed/echo/1200/800',
        price: 4499,
        features: ['Audio Player', 'Episode Transcripts', 'Guest Profiles', 'Sponsorship Kit', 'Merch Store'],
        description: 'A dedicated theme for podcasters featuring a custom audio player and episode management.',
        demoUrl: 'https://echo-podcast.demo'
      },
      {
        name: 'Bloom Florist',
        category: 'E-Commerce',
        previewUrl: 'https://picsum.photos/seed/bloom/1200/800',
        price: 5999,
        features: ['Delivery Date Picker', 'Custom Messages', 'Subscription Boxes', 'Occasion Filter', 'Care Guides'],
        description: 'A beautiful e-commerce theme tailored for florists with specific delivery and gifting features.',
        demoUrl: 'https://bloom-florist.demo'
      },
      {
        name: 'Apex Financial',
        category: 'Finance',
        previewUrl: 'https://picsum.photos/seed/apex/1200/800',
        price: 6999,
        features: ['Client Portal', 'Market Tickers', 'Calculators', 'Secure Forms', 'Advisor Booking'],
        description: 'A professional and secure theme for financial advisors, accountants, and consulting firms.',
        demoUrl: 'https://apex-finance.demo'
      },
      {
        name: 'Canvas Art Gallery',
        category: 'Portfolio',
        previewUrl: 'https://picsum.photos/seed/canvas/1200/800',
        price: 4999,
        features: ['Exhibition Calendar', 'Artist Profiles', 'Artwork Zoom', 'Purchase Inquiries', 'Virtual Viewing Room'],
        description: 'An elegant theme for art galleries and independent artists to showcase and sell their work.',
        demoUrl: 'https://canvas-gallery.demo'
      },
      {
        name: 'Sprint App Showcase',
        category: 'Landing Page',
        previewUrl: 'https://picsum.photos/seed/sprint/1200/800',
        price: 3999,
        features: ['App Store Links', 'Device Mockups', 'Feature Highlights', 'User Reviews', 'FAQ Accordion'],
        description: 'A high-converting landing page specifically designed to showcase mobile applications.',
        demoUrl: 'https://sprint-app.demo'
      },
      {
        name: 'Harmony Yoga',
        category: 'Health & Fitness',
        previewUrl: 'https://picsum.photos/seed/harmony/1200/800',
        price: 4499,
        features: ['Class Booking', 'Instructor Bios', 'Retreat Info', 'Mindfulness Blog', 'Video Courses'],
        description: 'A serene and calming theme for yoga studios and wellness retreats.',
        demoUrl: 'https://harmony-yoga.demo'
      },
      {
        name: 'Velocity Auto',
        category: 'Automotive',
        previewUrl: 'https://picsum.photos/seed/velocity/1200/800',
        price: 7499,
        features: ['Vehicle Inventory', 'Finance Calculator', 'Service Booking', 'Part Store', 'Compare Vehicles'],
        description: 'A robust theme for car dealerships and auto repair shops with inventory management.',
        demoUrl: 'https://velocity-auto.demo'
      },
      {
        name: 'Petal & Paws',
        category: 'Pet Services',
        previewUrl: 'https://picsum.photos/seed/petal/1200/800',
        price: 3499,
        features: ['Service Menu', 'Pet Profiles', 'Booking Calendar', 'Gallery', 'Care Tips'],
        description: 'A playful theme for pet groomers, sitters, and veterinary clinics.',
        demoUrl: 'https://petal-paws.demo'
      },
      {
        name: 'Crest Law Firm',
        category: 'Legal',
        previewUrl: 'https://picsum.photos/seed/crest/1200/800',
        price: 5999,
        features: ['Practice Areas', 'Attorney Profiles', 'Case Studies', 'Secure Consultation', 'Legal Blog'],
        description: 'A distinguished and authoritative theme for law firms and legal professionals.',
        demoUrl: 'https://crest-law.demo'
      },
      {
        name: 'Urban Barber',
        category: 'Services',
        previewUrl: 'https://picsum.photos/seed/urban/1200/800',
        price: 3999,
        features: ['Online Booking', 'Barber Profiles', 'Style Lookbook', 'Product Store', 'Loyalty Program'],
        description: 'A sharp, modern theme for barbershops and hair salons with integrated booking.',
        demoUrl: 'https://urban-barber.demo'
      },
      {
        name: 'Summit Event',
        category: 'Events',
        previewUrl: 'https://picsum.photos/seed/summit/1200/800',
        price: 6499,
        features: ['Ticket Sales', 'Speaker Lineup', 'Interactive Schedule', 'Sponsor Showcase', 'Venue Map'],
        description: 'A dynamic theme for conferences, festivals, and large-scale events with ticketing.',
        demoUrl: 'https://summit-event.demo'
      }
    ];

    const batch = writeBatch(db);
    for (const theme of attractiveThemes) {
      const newDocRef = doc(collection(db, 'themes'));
      batch.set(newDocRef, { ...theme, id: newDocRef.id });
    }
    await batch.commit();
  }
}
