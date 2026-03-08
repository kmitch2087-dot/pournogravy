import { Link } from "react-router-dom";
import { Product } from "@/data/products";
import { motion } from "framer-motion";

const ProductCard = ({ product }: { product: Product }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <Link to={`/product/${product.id}`} className="group block">
        <div className="relative aspect-square bg-muted overflow-hidden border border-border">
          {/* Placeholder for product image */}
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <span className="font-display text-center text-lg leading-tight tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              {product.name}
            </span>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Badge */}
          {product.badge && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-display tracking-widest">
              {product.badge}
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1">
          <h3 className="font-display text-sm tracking-wider truncate">{product.name}</h3>
          <p className="text-sm text-muted-foreground">${product.price.toFixed(2)}</p>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
