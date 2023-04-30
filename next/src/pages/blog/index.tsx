import Link from "next/link";
import styled from "styled-components";

import { Main } from "@Components/main";
import { Title } from "@Common/index";
import { getSortedPostsData } from "@Root/lib/blog";

interface PostData {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  slug: string;
}

interface HomeProps {
  allPostsData: Array<PostData>;
}

const PostTitle = styled(Title)`
  font-size: 1.2rem;
  text-decoration: underline;
`;

export default function Home({ allPostsData }: HomeProps) {
  return (
    <Main userKey={null}>
      <div style={{ maxWidth: "600px", margin: "3rem auto" }}>
        {allPostsData.map(({ id, title, slug }) => (
          <div key={id}>
            <Link href={`/blog/${slug}`}>
              <PostTitle>{title}</PostTitle>
            </Link>
          </div>
        ))}
      </div>
    </Main>
  );
}

export async function getStaticProps() {
  const allPostsData = getSortedPostsData();
  return {
    props: {
      allPostsData,
    },
  };
}
