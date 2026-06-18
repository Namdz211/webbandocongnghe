using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Provides Entity Framework Core access for manufacturers.
    /// </summary>
    public class ManufacturerRepository : Repository<Manufacturer>, IManufacturerRepository
    {
        /// <summary>
        /// Creates a manufacturer repository backed by the MySQL EF Core context.
        /// </summary>
        public ManufacturerRepository(MySqlDbContext context) : base(context)
        {
        }
    }
}
