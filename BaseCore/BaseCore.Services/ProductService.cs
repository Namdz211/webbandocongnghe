using BaseCore.Entities;
using BaseCore.Repository.EFCore;

namespace BaseCore.Services
{
    public class ProductService : IProductService
    {
        private readonly IProductRepositoryEF _productRepository;

        public ProductService(IProductRepositoryEF productRepository)
        {
            _productRepository = productRepository;
        }

        public async Task<List<Product>> GetAllProductsAsync()
        {
            return (await _productRepository.GetAllAsync()).ToList();
        }

        public async Task<Product> GetProductByIdAsync(int id)
        {
            return await _productRepository.GetByIdAsync(id);
        }

        public async Task<Product> CreateProductAsync(Product product)
        {
            return await _productRepository.AddAsync(product);
        }

        public async Task UpdateProductAsync(Product product)
        {
            await _productRepository.UpdateAsync(product);
        }

        public async Task DeleteProductAsync(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product != null)
            {
                await _productRepository.DeleteAsync(product);
            }
        }

        public async Task<(List<Product> Products, int TotalCount)> SearchAsync(
            string keyword,
            int? categoryId,
            string manufacturer,
            decimal? minPrice,
            decimal? maxPrice,
            string sortBy,
            int page,
            int pageSize)
        {
            return await _productRepository.SearchAsync(keyword, categoryId, manufacturer, minPrice, maxPrice, sortBy, page, pageSize);
        }
    }
}
