import mongoose from 'mongoose';

const str = (maxlength, required = false) => ({ type: String, trim: true, maxlength, required });

const placeSchema = new mongoose.Schema(
  {
    name: str(120, true),
    alternateName: str(120),
    address: str(200, true),
    neighborhood: str(80, true),
    city: str(80, true),
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: ([lng, lat, ...rest]) =>
            rest.length === 0 && Math.abs(lng) <= 180 && Math.abs(lat) <= 90,
          message: 'coordinates must be [lng, lat]',
        },
      },
    },
    phone: str(40),
    website: str(300),
    hours: str(500),
    rating: { type: Number, min: 0, max: 5 },
    tags: [str(40)],
  },
  { timestamps: true },
);

placeSchema.index({ location: '2dsphere' });

export default mongoose.models.Place || mongoose.model('Place', placeSchema);
