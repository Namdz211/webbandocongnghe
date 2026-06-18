using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Defines user-specific data access operations.
    /// </summary>
    public interface IUserRepositoryEF : IRepository<User>
    {
        /// <summary>
        /// Gets an active user by username.
        /// </summary>
        Task<User?> GetByUsernameAsync(string username);

        /// <summary>
        /// Searches users by keyword and returns one paged result set.
        /// </summary>
        Task<(List<User> Users, int TotalCount)> SearchAsync(string? keyword, int page, int pageSize);
    }

    /// <summary>
    /// Handles user queries that extend the generic repository behavior.
    /// </summary>
    public class UserRepositoryEF : Repository<User>, IUserRepositoryEF
    {
        /// <summary>
        /// Creates a user repository backed by the MySQL EF Core context.
        /// </summary>
        public UserRepositoryEF(AppDbContext context) : base(context)
        {
        }

        /// <inheritdoc />
        public async Task<User?> GetByUsernameAsync(string username)
        {
            return await _dbSet.FirstOrDefaultAsync(u => u.UserName == username && u.IsActive);
        }

        /// <inheritdoc />
        public async Task<(List<User> Users, int TotalCount)> SearchAsync(string? keyword, int page, int pageSize)
        {
            var query = _dbSet.AsQueryable();

            // Apply keyword search across the fields shown in user management.
            if (!string.IsNullOrEmpty(keyword))
            {
                keyword = keyword.ToLower();
                query = query.Where(u =>
                    u.UserName.ToLower().Contains(keyword) ||
                    u.Name.ToLower().Contains(keyword) ||
                    (u.Email != null && u.Email.ToLower().Contains(keyword)));
            }

            var totalCount = await query.CountAsync();

            var users = await query
                .OrderByDescending(u => u.Created)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (users, totalCount);
        }
    }
}
