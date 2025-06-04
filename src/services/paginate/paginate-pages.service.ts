import { PersonsDataService } from '../persons/persons-data.service'

export class PaginatePagesService {
  private personsData = new PersonsDataService()

  async getPagedPersons(query?: number, all?: boolean, page = 1, pageSize = 10) {
    let persons = []

    if (all) {
      persons = await this.personsData.getAllPersonsData()
    } else {
      const person = await this.personsData.getPersonData(Number(query))
      if (!person) throw new Error('No person folders found')
      persons = [person]
    }

    const paged = this.paginate(persons, page, pageSize)
    return { persons, paged }
  }

  private paginate<T>(items: T[], page = 1, pageSize = 10): T[] {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }
}
