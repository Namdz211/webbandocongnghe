using BaseCore.Entities;
using BaseCore.Repository.EFCore;

namespace BaseCore.Services
{
    public class CategoryService : ICategoryService
    {
        private readonly ICategoryRepositoryEF _categoryRepository;

        public CategoryService(ICategoryRepositoryEF categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        public async Task<List<Category>> GetAllAsync()
        {
            return (await _categoryRepository.GetAllAsync()).ToList();
        }

        public async Task<Category> GetByIdAsync(int id)
        {
            return await _categoryRepository.GetByIdAsync(id);
        }

        public async Task<Category> CreateAsync(Category category)
        {
            return await _categoryRepository.AddAsync(category);
        }

        public async Task UpdateAsync(Category category)
        {
            await _categoryRepository.UpdateAsync(category);
        }

        public async Task DeleteAsync(int id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category != null)
            {
                await _categoryRepository.DeleteAsync(category);
            }
        }
    }
}
