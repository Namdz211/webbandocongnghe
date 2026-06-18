using System.Linq.Expressions;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Defines common Entity Framework Core data access operations for an entity type.
    /// </summary>
    public interface IRepository<T> where T : class
    {
        /// <summary>
        /// Gets one entity by its primary key.
        /// </summary>
        Task<T?> GetByIdAsync(object id);

        /// <summary>
        /// Gets all entities from the current set.
        /// </summary>
        Task<IEnumerable<T>> GetAllAsync();

        /// <summary>
        /// Gets entities that match the supplied predicate.
        /// </summary>
        Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);

        /// <summary>
        /// Gets the first entity that matches the supplied predicate.
        /// </summary>
        Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate);

        /// <summary>
        /// Adds a new entity and persists it immediately.
        /// </summary>
        Task<T> AddAsync(T entity);

        /// <summary>
        /// Adds multiple entities and persists them immediately.
        /// </summary>
        Task AddRangeAsync(IEnumerable<T> entities);

        /// <summary>
        /// Updates an existing entity and persists it immediately.
        /// </summary>
        Task UpdateAsync(T entity);

        /// <summary>
        /// Deletes an entity and persists the change immediately.
        /// </summary>
        Task DeleteAsync(T entity);

        /// <summary>
        /// Deletes one entity by primary key when it exists.
        /// </summary>
        Task DeleteByIdAsync(object id);

        /// <summary>
        /// Gets one page of entities and the total count before pagination.
        /// </summary>
        Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
            int page,
            int pageSize,
            Expression<Func<T, bool>>? filter = null,
            Expression<Func<T, object>>? orderBy = null,
            bool descending = false);
    }
}
