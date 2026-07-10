import { projects } from "@/lib/data/home";

export default function ProjectsSection() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="ifma-section-title mb-10 text-center text-3xl font-semibold">
          Featured Projects
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project.name}
              className="ifma-card-shadow overflow-hidden border border-ifma-border-light bg-white"
            >
              <div className="h-48 bg-gradient-to-br from-ifma-navy via-ifma-blue to-ifma-highlight" />
              <div className="p-5">
                <h3 className="text-lg font-semibold text-ifma-navy">
                  {project.name}
                </h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
