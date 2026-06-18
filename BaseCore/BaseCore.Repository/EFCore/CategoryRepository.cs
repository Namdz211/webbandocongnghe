using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Defines category-specific data access operations.
    /// </summary>
    public interface ICategoryRepositoryEF : IRepository<Category>
    {
        /// <summary>
        /// Gets a category by its display name.
        /// </summary>
        Task<Category?> GetByNameAsync(string name);
    }

    /// <summary>
    /// Handles category queries that extend the generic repository behavior.
    /// </summary>
    public class CategoryRepositoryEF : Repository<Category>, ICategoryRepositoryEF
    {
        /// <summary>
        /// Creates a category repository backed by the MySQL EF Core context.
        /// </summary>
        public CategoryRepositoryEF(MySqlDbContext context) : base(context)
        {
        }

        /// <inheritdoc />
        public async Task<Category?> GetByNameAsync(string name)
        {
            return await _dbSet.FirstOrDefaultAsync(c => c.Name.ToLower() == name.ToLower());
        }
    }
}
